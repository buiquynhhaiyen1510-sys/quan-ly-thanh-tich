'use client'

import { useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

interface ParsedRow {
  idx: number
  fullName: string
  email: string
  password: string
  department: string
  teachingSince: string
  dateOfBirth: string
  isPartyMember: boolean
  partyJoinDate: string
  errors: string[]
  emailExists: boolean
  selected: boolean
}

function parseDate(s: string): string {
  if (!s.trim()) return ''
  const parts = s.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s.trim()
}

function isPartyValue(s: string): boolean {
  return ['x', 'có', 'co', '1', 'true', 'yes', 'đảng viên'].includes(s.trim().toLowerCase())
}

function validateRow(row: ParsedRow): string[] {
  const errs: string[] = []
  if (!row.fullName.trim()) errs.push('Thiếu họ tên')
  else if (row.fullName.trim().length < 2) errs.push('Họ tên quá ngắn')
  if (!row.email.trim()) errs.push('Thiếu email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errs.push('Email không hợp lệ')
  if (!row.password) errs.push('Thiếu mật khẩu')
  else if (row.password.length < 8) errs.push('Mật khẩu < 8 ký tự')
  if (!row.department.trim()) errs.push('Thiếu tổ chuyên môn')
  const yr = parseInt(row.teachingSince, 10)
  if (!row.teachingSince || isNaN(yr) || yr < 1970 || yr > new Date().getFullYear())
    errs.push('Năm vào nghề không hợp lệ')
  if (row.dateOfBirth) {
    const y = new Date(row.dateOfBirth).getFullYear()
    if (isNaN(y) || y < 1930 || y > new Date().getFullYear()) errs.push('Ngày sinh không hợp lệ')
  }
  if (row.isPartyMember && !row.partyJoinDate) errs.push('Thiếu ngày kết nạp đảng')
  return errs
}

function parseExcel(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
  const rows: ParsedRow[] = []

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    const emailRaw = (cols[1] ?? '').trim()
    // Bỏ qua hàng tiêu đề
    if (i === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) continue

    const isParty = isPartyValue(cols[6] ?? '')
    const row: ParsedRow = {
      idx: rows.length,
      fullName: (cols[0] ?? '').trim(),
      email: emailRaw.toLowerCase(),
      password: (cols[2] ?? '').trim(),
      department: (cols[3] ?? '').trim(),
      teachingSince: (cols[4] ?? '').trim(),
      dateOfBirth: parseDate(cols[5] ?? ''),
      isPartyMember: isParty,
      partyJoinDate: isParty ? parseDate(cols[7] ?? '') : '',
      errors: [],
      emailExists: false,
      selected: true,
    }
    row.errors = validateRow(row)
    rows.push(row)
  }
  return rows
}

type Step = 'paste' | 'preview' | 'importing' | 'done'

export function BulkImportDialog({ open, onOpenChange, onDone }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('paste')
  const [pasteText, setPasteText] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{ email: string; success: boolean; error?: string }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function reset() {
    setStep('paste')
    setPasteText('')
    setRows([])
    setChecking(false)
    setProgress(0)
    setImportResults([])
  }

  async function handleParse() {
    if (!pasteText.trim()) return
    const parsed = parseExcel(pasteText)
    if (parsed.length === 0) return

    setRows(parsed)
    setChecking(true)
    setStep('preview')

    // Check emails
    const emails = parsed.map(r => r.email).filter(Boolean)
    try {
      const res = await fetch('/api/admin/teachers/check-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      if (res.ok) {
        const { exists }: { exists: string[] } = await res.json()
        const existSet = new Set(exists)
        setRows(prev => prev.map(r => ({ ...r, emailExists: existSet.has(r.email) })))
      }
    } catch {
      // ignore check error
    } finally {
      setChecking(false)
    }
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map(r => r.idx === idx ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll() {
    const validRows = rows.filter(r => r.errors.length === 0 && !r.emailExists)
    const allSelected = validRows.every(r => r.selected)
    setRows(prev => prev.map(r => {
      if (r.errors.length > 0 || r.emailExists) return r
      return { ...r, selected: !allSelected }
    }))
  }

  async function handleImport() {
    const toImport = rows.filter(r => r.selected && r.errors.length === 0 && !r.emailExists)
    if (toImport.length === 0) return

    setStep('importing')
    setProgress(0)
    const results: { email: string; success: boolean; error?: string }[] = []

    const teachers = toImport.map(r => ({
      fullName: r.fullName,
      email: r.email,
      password: r.password,
      role: 'TEACHER',
      department: r.department,
      teachingSince: parseInt(r.teachingSince, 10),
      dateOfBirth: r.dateOfBirth || null,
      isPartyMember: r.isPartyMember,
      partyJoinDate: r.isPartyMember && r.partyJoinDate ? r.partyJoinDate : null,
    }))

    try {
      const res = await fetch('/api/admin/teachers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers }),
      })
      if (res.ok) {
        const data = await res.json()
        results.push(...data.results)
      } else {
        toImport.forEach(r => results.push({ email: r.email, success: false, error: 'Lỗi server' }))
      }
    } catch {
      toImport.forEach(r => results.push({ email: r.email, success: false, error: 'Không kết nối được server' }))
    }

    setProgress(100)
    setImportResults(results)
    setStep('done')
    onDone()
  }

  const validCount = rows.filter(r => r.errors.length === 0 && !r.emailExists).length
  const selectedCount = rows.filter(r => r.selected && r.errors.length === 0 && !r.emailExists).length
  const successCount = importResults.filter(r => r.success).length
  const failCount = importResults.filter(r => !r.success).length

  function rowBg(r: ParsedRow) {
    if (r.emailExists) return 'bg-red-50 border-l-4 border-red-400'
    if (r.errors.length > 0) return 'bg-yellow-50 border-l-4 border-yellow-400'
    if (!r.selected) return 'bg-gray-50 opacity-60'
    return 'bg-green-50 border-l-4 border-green-400'
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Nhập giáo viên từ Excel
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                Copy dữ liệu từ Excel và dán vào đây
              </p>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5">

            {/* STEP: PASTE */}
            {step === 'paste' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Thứ tự cột Excel (theo đúng thứ tự này):</p>
                  <p className="font-mono text-xs">A: Họ tên &nbsp;|&nbsp; B: Email &nbsp;|&nbsp; C: Mật khẩu &nbsp;|&nbsp; D: Tổ chuyên môn &nbsp;|&nbsp; E: Năm vào nghề &nbsp;|&nbsp; F: Ngày sinh (DD/MM/YYYY) &nbsp;|&nbsp; G: Đảng viên (x/có) &nbsp;|&nbsp; H: Ngày kết nạp đảng</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dán dữ liệu từ Excel vào đây (Ctrl+V)
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Dán dữ liệu Excel vào đây..."
                    rows={10}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {pasteText.split('\n').filter(l => l.trim()).length} dòng đã dán
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleParse}
                    disabled={!pasteText.trim()}
                    className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Phân tích dữ liệu →
                  </button>
                  <Dialog.Close className="border px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50">
                    Hủy
                  </Dialog.Close>
                </div>
              </div>
            )}

            {/* STEP: PREVIEW */}
            {step === 'preview' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4 flex-wrap text-sm">
                  <span className="text-gray-600">Tổng: <strong>{rows.length}</strong> dòng</span>
                  <span className="text-green-700">Hợp lệ: <strong>{validCount}</strong></span>
                  <span className="text-red-600">Lỗi: <strong>{rows.length - validCount}</strong></span>
                  {checking && <span className="text-blue-600 animate-pulse">Đang kiểm tra email...</span>}
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /> Hợp lệ</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" /> Email đã tồn tại</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm inline-block" /> Dữ liệu lỗi</span>
                </div>

                {/* Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={selectedCount === validCount && validCount > 0}
                              onChange={toggleAll}
                              className="w-3.5 h-3.5"
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">#</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Họ tên</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Email</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Tổ CM</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Năm vào nghề</th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map(r => (
                          <tr key={r.idx} className={rowBg(r)}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={r.selected && r.errors.length === 0 && !r.emailExists}
                                disabled={r.errors.length > 0 || r.emailExists}
                                onChange={() => toggleRow(r.idx)}
                                className="w-3.5 h-3.5"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-400">{r.idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.fullName || <span className="text-red-400">Trống</span>}</td>
                            <td className="px-3 py-2 text-gray-700">{r.email || <span className="text-red-400">Trống</span>}</td>
                            <td className="px-3 py-2 text-gray-600">{r.department || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.teachingSince || '—'}</td>
                            <td className="px-3 py-2">
                              {r.emailExists ? (
                                <span className="text-red-600 font-medium">Email đã tồn tại</span>
                              ) : r.errors.length > 0 ? (
                                <span className="text-yellow-700">{r.errors.join('; ')}</span>
                              ) : (
                                <span className="text-green-700 font-medium">✓ Hợp lệ</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    onClick={handleImport}
                    disabled={selectedCount === 0 || checking}
                    className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Nhập {selectedCount} giáo viên hợp lệ
                  </button>
                  <button
                    onClick={reset}
                    className="border px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ← Dán lại
                  </button>
                </div>
              </div>
            )}

            {/* STEP: IMPORTING */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600">Đang nhập giáo viên...</p>
              </div>
            )}

            {/* STEP: DONE */}
            {step === 'done' && (
              <div className="space-y-4">
                <div className="flex gap-6 py-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{successCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Thành công</p>
                  </div>
                  {failCount > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{failCount}</p>
                      <p className="text-sm text-gray-500 mt-1">Thất bại</p>
                    </div>
                  )}
                </div>

                {failCount > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 text-xs font-medium text-red-700">Các dòng thất bại</div>
                    {importResults.filter(r => !r.success).map((r, i) => (
                      <div key={i} className="px-4 py-2 text-xs border-t border-red-100">
                        <span className="font-medium">{r.email}</span>
                        <span className="text-red-600 ml-2">— {r.error}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Dialog.Close
                    onClick={reset}
                    className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Xong
                  </Dialog.Close>
                  {failCount > 0 && (
                    <button
                      onClick={reset}
                      className="border px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Nhập lại các dòng lỗi
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
