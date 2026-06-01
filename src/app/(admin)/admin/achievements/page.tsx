'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface CompetitionTitle {
  id: string
  danhHieuId: string
  danhHieu?: { id: string; name: string }
  level: string | null
  achievementMethod: string | null
}

interface DanhHieuOption {
  id: string
  name: string
}

interface YearlyRecord {
  id: string
  academicYear: string
  taskResult: string
  partyRating: string | null
  competitionTitles: CompetitionTitle[]
}

interface SKKN {
  id: string
  title: string
  level: string
  rating: string
  academicYear: string
  status: string
}

interface Award {
  id: string
  type: string
  issuingLevel: string
  content: string
  year: string
}

interface TeacherStat {
  id: string
  fullName: string
  department: string
  isPartyMember: boolean
  yearlyRecord: YearlyRecord | null
  skkns: SKKN[]
  awards: Award[]
}

interface Department {
  id: string
  name: string
}

const TASK_LABELS: Record<string, string> = { GOOD: 'HTTốt', EXCELLENT: 'HTXS' }
const TASK_COLORS: Record<string, string> = {
  GOOD: 'bg-blue-50 text-blue-700',
  EXCELLENT: 'bg-green-50 text-green-700',
}
const TITLE_LABELS: Record<string, string> = {
  CHIEN_SI_THI_DUA: 'CSTĐ',
  GV_GIOI: 'GV Giỏi',
  GV_CN_GIOI: 'GV CN Giỏi',
}
const LEVEL_LABELS: Record<string, string> = {
  SCHOOL: 'Cấp trường',
  DISTRICT: 'Cấp phường',
  CITY: 'Cấp tỉnh/TP',
}
const METHOD_LABELS: Record<string, string> = {
  METHOD_1: 'HTXS',
  METHOD_2: 'SKKN',
}

function generateAcademicYears(): string[] {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = 2019; y <= currentYear + 1; y++) {
    years.push(`${y}-${y + 1}`)
  }
  return years.reverse()
}

export default function AchievementsReportPage() {
  const currentYear = new Date().getFullYear()
  const defaultYear = `${currentYear - 1}-${currentYear}`

  // Server-side filters
  const [year, setYear] = useState(defaultYear)
  const [department, setDepartment] = useState('')

  // Client-side filters
  const [filterTaskResult, setFilterTaskResult] = useState('')
  const [filterSKKNLevel, setFilterSKKNLevel] = useState('')
  const [filterTitleType, setFilterTitleType] = useState('')
  const [filterAwardType, setFilterAwardType] = useState('')

  const [rawData, setRawData] = useState<TeacherStat[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [danhHieus, setDanhHieus] = useState<DanhHieuOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/departments').then(r => r.json()).then(setDepartments).catch(() => {})
    fetch('/api/admin/danh-hieu').then(r => r.json()).then((data: DanhHieuOption[]) =>
      setDanhHieus(data.filter((d: DanhHieuOption & { isActive?: boolean }) => d.isActive !== false))
    ).catch(() => {})
  }, [])

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, department])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year })
      if (department) params.set('department', department)
      const res = await fetch(`/api/admin/achievements-report?${params}`)
      if (res.ok) setRawData(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Áp dụng bộ lọc client-side
  const data = useMemo(() => {
    return rawData.filter(t => {
      // KQ nhiệm vụ
      if (filterTaskResult === 'NOT_ENTERED') { if (t.yearlyRecord) return false }
      else if (filterTaskResult) { if (t.yearlyRecord?.taskResult !== filterTaskResult) return false }

      // Danh hiệu thi đua
      const titles = t.yearlyRecord?.competitionTitles ?? []
      if (filterTitleType === 'HAS_ANY') { if (titles.length === 0) return false }
      else if (filterTitleType === 'NONE') { if (titles.length > 0) return false }
      else if (filterTitleType) { if (!titles.some(tt => tt.danhHieuId === filterTitleType)) return false }

      // SKKN
      if (filterSKKNLevel === 'HAS_ANY') { if (t.skkns.length === 0) return false }
      else if (filterSKKNLevel === 'NONE') { if (t.skkns.length > 0) return false }
      else if (filterSKKNLevel === 'HAS_UNUSED') { if (!t.skkns.some(s => s.status === 'UNUSED')) return false }
      else if (filterSKKNLevel) { if (!t.skkns.some(s => s.level === filterSKKNLevel)) return false }

      // Khen thưởng
      if (filterAwardType === 'HAS_ANY') { if (t.awards.length === 0) return false }
      else if (filterAwardType === 'NONE') { if (t.awards.length > 0) return false }
      else if (filterAwardType) { if (!t.awards.some(a => a.type === filterAwardType)) return false }

      return true
    })
  }, [rawData, filterTaskResult, filterSKKNLevel, filterTitleType, filterAwardType])

  // Chỉ hiển thị các option filter có dữ liệu thực tế
  const availableTitleTypes = useMemo(() => {
    const types = new Set<string>()
    rawData.forEach(t => t.yearlyRecord?.competitionTitles.forEach(ct => types.add(ct.danhHieuId)))
    return types
  }, [rawData])

  const availableSKKNLevels = useMemo(() => {
    const levels = new Set<string>()
    rawData.forEach(t => t.skkns.forEach(s => levels.add(s.level)))
    return levels
  }, [rawData])

  const availableAwardTypes = useMemo(() => {
    const types = new Set<string>()
    rawData.forEach(t => t.awards.forEach(a => types.add(a.type)))
    return types
  }, [rawData])

  const totalHTXS = data.filter(t => t.yearlyRecord?.taskResult === 'EXCELLENT').length
  const totalHTTot = data.filter(t => t.yearlyRecord?.taskResult === 'GOOD').length
  const totalWithSKKN = data.filter(t => t.skkns.length > 0).length
  const totalNotEntered = data.filter(t => !t.yearlyRecord).length

  function resetFilters() {
    setFilterTaskResult('')
    setFilterSKKNLevel('')
    setFilterTitleType('')
    setFilterAwardType('')
  }

  const hasActiveFilter = filterTaskResult || filterSKKNLevel || filterTitleType || filterAwardType

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thống kê thành tích</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng hợp thành tích giáo viên theo năm học</p>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Hàng 1: Năm học + Tổ chuyên môn (server-side) */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Năm học
            </label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {generateAcademicYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Tổ chuyên môn
            </label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả tổ</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc nâng cao (client-side) */}
        <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              KQ nhiệm vụ
            </label>
            <select
              value={filterTaskResult}
              onChange={e => setFilterTaskResult(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả</option>
              <option value="EXCELLENT">HTXS</option>
              <option value="GOOD">HTTốt</option>
              <option value="NOT_ENTERED">Chưa nhập</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Danh hiệu thi đua
            </label>
            <select
              value={filterTitleType}
              onChange={e => setFilterTitleType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả</option>
              <option value="HAS_ANY">Có danh hiệu</option>
              <option value="NONE">Chưa có</option>
              {danhHieus.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              SKKN
            </label>
            <select
              value={filterSKKNLevel}
              onChange={e => setFilterSKKNLevel(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả</option>
              <option value="HAS_ANY">Có SKKN</option>
              <option value="NONE">Không có SKKN</option>
              <option value="HAS_UNUSED">Có SKKN chưa dùng</option>
              <option value="SCHOOL">Cấp trường</option>
              <option value="DISTRICT">Cấp phường</option>
              <option value="CITY">Cấp tỉnh/TP</option>
            </select>
            </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Khen thưởng
            </label>
              <select
                value={filterAwardType}
                onChange={e => setFilterAwardType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tất cả</option>
              <option value="HAS_ANY">Có khen thưởng</option>
              <option value="NONE">Chưa có</option>
              <option value="CERTIFICATE">Giấy khen</option>
              <option value="COMMENDATION">Bằng khen</option>
              <option value="CERTIFICATE_OF_MERIT">Bằng khen TT/Nhà nước</option>
              </select>
            </div>

          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Tóm tắt */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Tổng GV', value: data.length, color: 'text-gray-900' },
          { label: 'HTXS', value: totalHTXS, color: 'text-green-700' },
          { label: 'HTTốt', value: totalHTTot, color: 'text-blue-700' },
          { label: 'Có SKKN', value: totalWithSKKN, color: 'text-purple-700' },
          { label: 'Chưa nhập', value: totalNotEntered, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bảng */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">Đang tải...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">Không có giáo viên nào khớp bộ lọc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Họ tên</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Tổ CM</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">KQ nhiệm vụ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Danh hiệu thi đua</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">SKKN</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Khen thưởng</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((t, idx) => {
                  const record = t.yearlyRecord
                  const titles = record?.competitionTitles ?? []
                  const usedSKKN = t.skkns.filter(s => s.status === 'USED').length
                  const unusedSKKN = t.skkns.filter(s => s.status === 'UNUSED').length

                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{t.fullName}</p>
                        {t.isPartyMember && record?.partyRating && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Đảng: {TASK_LABELS[record.partyRating] ?? record.partyRating}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {t.department || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {record ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TASK_COLORS[record.taskResult] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TASK_LABELS[record.taskResult] ?? record.taskResult}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">Chưa nhập</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {titles.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {titles.map(title => (
                              <div key={title.id} className="text-xs text-gray-700">
                                {title.danhHieu?.name ?? title.danhHieuId}
                                {title.level ? ` (${LEVEL_LABELS[title.level] ?? title.level})` : ''}
                                {title.achievementMethod
                                  ? ` — ${METHOD_LABELS[title.achievementMethod] ?? title.achievementMethod}`
                                  : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {t.skkns.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="text-xs space-y-0.5">
                            {unusedSKKN > 0 && (
                              <span className="text-green-700 font-medium block">
                                {unusedSKKN} chưa dùng
                              </span>
                            )}
                            {usedSKKN > 0 && (
                              <span className="text-amber-600 block">{usedSKKN} đã dùng</span>
                            )}
                            {filterSKKNLevel && (
                              <span className="text-gray-400 block">
                                ({t.skkns.filter(s => s.level === filterSKKNLevel).length} {LEVEL_LABELS[filterSKKNLevel]})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {t.awards.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {t.awards.map(a => (
                              <div key={a.id} className="text-xs text-gray-700">
                                {a.type === 'CERTIFICATE' ? 'Giấy khen' : 'Bằng khen'} — {a.issuingLevel}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/teachers/${t.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Xem →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          Hiển thị {data.length} / {rawData.length} giáo viên · Năm học {year}
          {hasActiveFilter && ' · Đang lọc'}
        </div>
      </div>
    </div>
  )
}
