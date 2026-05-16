'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// --- Types ---
interface DanhHieu {
  id: string
  name: string
  isActive: boolean
}

interface CompetitionTitle {
  id: string
  danhHieuId: string
  danhHieu?: { name: string }
  level: 'SCHOOL' | 'DISTRICT' | 'CITY' | null
  achievementMethod: 'METHOD_1' | 'METHOD_2' | null
}

interface YearlyRecord {
  id: string
  academicYear: string
  taskResult: 'NOT_COMPLETED' | 'GOOD' | 'EXCELLENT'
  partyRating: 'GOOD' | 'EXCELLENT' | null
  competitionTitles: CompetitionTitle[]
}

interface SKKN {
  id: string
  title: string
  level: 'SCHOOL' | 'DISTRICT' | 'CITY'
  rating: string
  academicYear: string
  status: 'UNUSED' | 'USED'
  usedFor: string | null
  usedYear: string | null
}

interface Attachment {
  url: string
  name: string
  fileType: 'pdf' | 'image'
}

interface Award {
  id: string
  type: 'CERTIFICATE' | 'COMMENDATION' | 'CERTIFICATE_OF_MERIT'
  issuingLevel: string
  content: string
  year: string
  decisionNumber: string | null
  decisionDate: string | null
  attachmentUrls: Attachment[]
}

interface Rule {
  id: string
  targetTitle: string
  isActive: boolean
}

interface AvailableSKKN {
  id: string
  title: string
  level: string
  rating: string
  academicYear: string
}

// --- Helpers ---
function currentAcademicYear(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

function generateYears(): string[] {
  const current = currentAcademicYear()
  const startYear = parseInt(current.split('-')[0])
  const years: string[] = []
  for (let y = startYear; y >= startYear - 9; y--) {
    years.push(`${y}-${y + 1}`)
  }
  return years
}

const LEVEL_LABELS: Record<string, string> = {
  SCHOOL: 'Cấp trường',
  DISTRICT: 'Cấp phường',
  CITY: 'Cấp tỉnh/TP',
}

function isCSTD(name: string): boolean {
  return name.toLowerCase().includes('chiến sĩ thi đua')
}

// --- Main component ---
export default function AchievementsPage() {
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear())
  const years = generateYears()

  const [allData, setAllData] = useState<{
    yearlyRecords: YearlyRecord[]
    skkns: SKKN[]
    awards: Award[]
  }>({ yearlyRecords: [], skkns: [], awards: [] })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [danhHieus, setDanhHieus] = useState<DanhHieu[]>([])
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchAll = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true)
    else setRefreshing(true)
    try {
      const [achRes, dhRes] = await Promise.all([
        fetch('/api/teacher/achievements'),
        fetch('/api/teacher/danh-hieu'),
      ])
      if (!achRes.ok) throw new Error('Không thể tải dữ liệu')
      const data = await achRes.json()
      setAllData(data)
      if (dhRes.ok) {
        const dhData: DanhHieu[] = await dhRes.json()
        setDanhHieus(dhData.filter(d => d.isActive))
      }
    } catch {
      showNotification('error', 'Không thể tải dữ liệu thành tích')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll(true) }, [fetchAll])

  // Derived: data for selected year
  const yearRecord = allData.yearlyRecords.find(r => r.academicYear === selectedYear) ?? null
  const yearSkkns = allData.skkns.filter(s => s.academicYear === selectedYear)
  const [startY, endY] = selectedYear.split('-')
  const yearAwards = allData.awards.filter(a => a.year === startY || a.year === endY)

  // --- Yearly record form ---
  const [taskResult, setTaskResult] = useState<'NOT_COMPLETED' | 'GOOD' | 'EXCELLENT'>('GOOD')
  const [partyRating, setPartyRating] = useState<'' | 'GOOD' | 'EXCELLENT'>('')
  const [savingRecord, setSavingRecord] = useState(false)
  const [savingParty, setSavingParty] = useState(false)

  useEffect(() => {
    if (yearRecord) {
      setTaskResult(yearRecord.taskResult)
      setPartyRating(yearRecord.partyRating ?? '')
    } else {
      setTaskResult('GOOD')
      setPartyRating('')
    }
  }, [yearRecord, selectedYear])

  async function saveYearlyRecord(fields: { taskResult: 'NOT_COMPLETED' | 'GOOD' | 'EXCELLENT'; partyRating: '' | 'GOOD' | 'EXCELLENT' }) {
    const res = await fetch('/api/teacher/yearly-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: selectedYear,
        taskResult: fields.taskResult,
        partyRating: fields.partyRating || null,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d?.error ?? 'Lưu thất bại')
    }
  }

  async function handleSaveTaskResult() {
    setSavingRecord(true)
    try {
      await saveYearlyRecord({ taskResult, partyRating })
      await fetchAll()
      showNotification('success', 'Đã lưu kết quả nhiệm vụ')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingRecord(false)
    }
  }

  async function handleSavePartyRating() {
    setSavingParty(true)
    try {
      await saveYearlyRecord({ taskResult, partyRating })
      await fetchAll()
      showNotification('success', 'Đã lưu xếp loại đảng viên')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingParty(false)
    }
  }

  // --- Competition title form ---
  const [titleDanhHieuId, setTitleDanhHieuId] = useState('')
  const [titleLevel, setTitleLevel] = useState<'SCHOOL' | 'DISTRICT' | 'CITY'>('DISTRICT')
  const [titleMethod, setTitleMethod] = useState<'METHOD_1' | 'METHOD_2' | ''>('')
  const [addingTitle, setAddingTitle] = useState(false)

  const selectedDanhHieu = danhHieus.find(d => d.id === titleDanhHieuId)
  const isCSTDSelected = selectedDanhHieu ? isCSTD(selectedDanhHieu.name) : false

  // Auto-adjust level when CSTD selected and SCHOOL is the current level
  useEffect(() => {
    if (isCSTDSelected && titleLevel === 'SCHOOL') {
      setTitleLevel('DISTRICT')
    }
  }, [isCSTDSelected, titleLevel])

  // --- SKKN-consume modal (for METHOD_2) ---
  const [skknModalOpen, setSkknModalOpen] = useState(false)
  const [modalRules, setModalRules] = useState<Rule[]>([])
  const [modalRuleId, setModalRuleId] = useState('')
  const [modalSKKNs, setModalSKKNs] = useState<AvailableSKKN[]>([])
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set())
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSKKNsLoading, setModalSKKNsLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const prevRuleIdRef = useRef('')

  async function openSKKNModal() {
    setSkknModalOpen(true)
    setModalSelectedIds(new Set())
    setModalSKKNs([])
    setModalError(null)
    setModalLoading(true)
    try {
      const res = await fetch('/api/admin/rules')
      if (res.ok) {
        const data: Rule[] = await res.json()
        const active = data.filter(r => r.isActive)
        setModalRules(active)
        if (active.length > 0) setModalRuleId(active[0].id)
      }
    } catch {
      setModalError('Không thể tải danh sách quy tắc')
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    if (!skknModalOpen || !modalRuleId || modalRuleId === prevRuleIdRef.current) return
    prevRuleIdRef.current = modalRuleId
    setModalSKKNsLoading(true)
    setModalSelectedIds(new Set())
    fetch(`/api/teacher/skkn/available?ruleId=${encodeURIComponent(modalRuleId)}&referenceYear=${encodeURIComponent(selectedYear)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setModalSKKNs)
      .catch(() => setModalSKKNs([]))
      .finally(() => setModalSKKNsLoading(false))
  }, [skknModalOpen, modalRuleId, selectedYear])

  function toggleModalSKKN(id: string) {
    setModalSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirmSKKNConsume() {
    if (!yearRecord) return
    setModalLoading(true)
    setModalError(null)
    try {
      const res = await fetch('/api/teacher/competition-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearlyRecordId: yearRecord.id,
          danhHieuId: titleDanhHieuId,
          level: titleLevel,
          achievementMethod: 'METHOD_2',
          ruleId: modalRuleId,
          skknIds: Array.from(modalSelectedIds),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Thêm danh hiệu thất bại')
      }
      setSkknModalOpen(false)
      await fetchAll()
      showNotification('success', 'Đã thêm danh hiệu và tiêu SKKN thành công')
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setModalLoading(false)
    }
  }

  async function handleAddTitle() {
    if (!yearRecord) {
      showNotification('error', 'Cần lưu kết quả nhiệm vụ trước')
      return
    }
    if (!titleDanhHieuId) {
      showNotification('error', 'Vui lòng chọn loại danh hiệu')
      return
    }
    if (titleMethod === 'METHOD_2') {
      prevRuleIdRef.current = ''
      await openSKKNModal()
      return
    }
    setAddingTitle(true)
    try {
      const res = await fetch('/api/teacher/competition-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearlyRecordId: yearRecord.id,
          danhHieuId: titleDanhHieuId,
          level: isCSTDSelected ? null : (titleLevel || null),
          achievementMethod: titleMethod || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Thêm danh hiệu thất bại')
      }
      await fetchAll()
      showNotification('success', 'Đã thêm danh hiệu thi đua')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setAddingTitle(false)
    }
  }

  async function handleDeleteTitle(id: string) {
    if (!confirm('Xóa danh hiệu này?')) return
    try {
      const res = await fetch(`/api/teacher/competition-titles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Xóa thất bại')
      await fetchAll()
      showNotification('success', 'Đã xóa danh hiệu')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  // --- Edit: competition title ---
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editTitleDanhHieuId, setEditTitleDanhHieuId] = useState('')
  const [editTitleLevel, setEditTitleLevel] = useState<'SCHOOL' | 'DISTRICT' | 'CITY'>('DISTRICT')
  const [savingTitle, setSavingTitle] = useState(false)

  function startEditTitle(t: CompetitionTitle) {
    setEditingTitleId(t.id)
    setEditTitleDanhHieuId(t.danhHieuId)
    setEditTitleLevel(t.level ?? 'DISTRICT')
  }

  async function handleSaveTitle(id: string) {
    setSavingTitle(true)
    try {
      const editDh = danhHieus.find(d => d.id === editTitleDanhHieuId)
      const isCSTDEdit = editDh ? isCSTD(editDh.name) : false
      const res = await fetch(`/api/teacher/competition-titles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          danhHieuId: editTitleDanhHieuId,
          level: isCSTDEdit ? null : editTitleLevel,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Lưu thất bại')
      }
      setEditingTitleId(null)
      await fetchAll()
      showNotification('success', 'Đã cập nhật danh hiệu')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingTitle(false)
    }
  }

  // --- Edit: award ---
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null)
  const [editAwardType, setEditAwardType] = useState<'CERTIFICATE' | 'COMMENDATION' | 'CERTIFICATE_OF_MERIT'>('CERTIFICATE')
  const [editAwardIssuer, setEditAwardIssuer] = useState('')
  const [editAwardContent, setEditAwardContent] = useState('')
  const [editAwardYear, setEditAwardYear] = useState('')
  const [editAwardDecisionNumber, setEditAwardDecisionNumber] = useState('')
  const [editAwardDecisionDate, setEditAwardDecisionDate] = useState('')
  const [savingAward, setSavingAward] = useState(false)

  function startEditAward(a: Award) {
    setEditingAwardId(a.id)
    setEditAwardType(a.type)
    setEditAwardIssuer(a.issuingLevel)
    setEditAwardContent(a.content)
    setEditAwardYear(a.year)
    setEditAwardDecisionNumber(a.decisionNumber ?? '')
    setEditAwardDecisionDate(
      a.decisionDate ? new Date(a.decisionDate).toISOString().split('T')[0] : ''
    )
  }

  async function handleSaveAward(id: string) {
    setSavingAward(true)
    try {
      const res = await fetch(`/api/teacher/awards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editAwardType,
          issuingLevel: editAwardIssuer.trim(),
          content: editAwardContent.trim(),
          year: editAwardYear,
          decisionNumber: editAwardDecisionNumber.trim() || null,
          decisionDate: editAwardDecisionDate || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Lưu thất bại')
      }
      setEditingAwardId(null)
      await fetchAll()
      showNotification('success', 'Đã cập nhật khen thưởng')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingAward(false)
    }
  }

  // --- Edit: SKKN ---
  const [editingSkknId, setEditingSkknId] = useState<string | null>(null)
  const [editSkknTitle, setEditSkknTitle] = useState('')
  const [editSkknLevel, setEditSkknLevel] = useState<'SCHOOL' | 'DISTRICT' | 'CITY'>('SCHOOL')
  const [editSkknRating, setEditSkknRating] = useState('')
  const [savingSkkn, setSavingSkkn] = useState(false)

  function startEditSkkn(s: SKKN) {
    setEditingSkknId(s.id)
    setEditSkknTitle(s.title)
    setEditSkknLevel(s.level)
    setEditSkknRating(s.rating)
  }

  async function handleSaveSkkn(id: string) {
    setSavingSkkn(true)
    try {
      const res = await fetch(`/api/teacher/skkn/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editSkknTitle.trim(),
          level: editSkknLevel,
          rating: editSkknRating.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Lưu thất bại')
      }
      setEditingSkknId(null)
      await fetchAll()
      showNotification('success', 'Đã cập nhật SKKN')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSavingSkkn(false)
    }
  }

  // --- SKKN form ---
  const [skknTitle, setSkknTitle] = useState('')
  const [skknLevel, setSkknLevel] = useState<'SCHOOL' | 'DISTRICT' | 'CITY'>('SCHOOL')
  const [skknRating, setSkknRating] = useState('')
  const [addingSkkn, setAddingSkkn] = useState(false)

  async function handleAddSkkn(e: React.FormEvent) {
    e.preventDefault()
    if (!skknTitle.trim() || !skknRating.trim()) return
    setAddingSkkn(true)
    try {
      const res = await fetch('/api/teacher/skkn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: skknTitle.trim(),
          level: skknLevel,
          rating: skknRating.trim(),
          academicYear: selectedYear,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Thêm SKKN thất bại')
      }
      setSkknTitle('')
      setSkknRating('')
      await fetchAll()
      showNotification('success', 'Đã thêm SKKN')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setAddingSkkn(false)
    }
  }

  async function handleDeleteSkkn(id: string) {
    if (!confirm('Xóa SKKN này? Chỉ SKKN chưa được sử dụng mới có thể xóa.')) return
    try {
      const res = await fetch(`/api/teacher/skkn/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Xóa thất bại')
      }
      await fetchAll()
      showNotification('success', 'Đã xóa SKKN')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  // --- Award form ---
  const [awardType, setAwardType] = useState<'CERTIFICATE' | 'COMMENDATION' | 'CERTIFICATE_OF_MERIT'>('CERTIFICATE')
  const [awardIssuer, setAwardIssuer] = useState('')
  const [awardContent, setAwardContent] = useState('')
  const [awardYear, setAwardYear] = useState(endY)
  const [awardDecisionNumber, setAwardDecisionNumber] = useState('')
  const [awardDecisionDate, setAwardDecisionDate] = useState('')
  const [awardAttachments, setAwardAttachments] = useState<Attachment[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [addingAward, setAddingAward] = useState(false)

  useEffect(() => {
    const [, ey] = selectedYear.split('-')
    setAwardYear(ey)
  }, [selectedYear])

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      showNotification('error', 'Chỉ chấp nhận file PDF hoặc ảnh (JPG, PNG...)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'File không được vượt quá 10MB')
      return
    }

    setUploadingFile(true)
    try {
      // 1. Get signed params from server
      const sigRes = await fetch('/api/teacher/upload')
      const sig = await sigRes.json()
      if (!sigRes.ok) throw new Error(sig?.error ?? 'Không thể lấy chữ ký upload')

      // 2. Upload directly to Cloudinary (bypasses Vercel, supports up to 100MB)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', sig.apiKey)
      fd.append('timestamp', String(sig.timestamp))
      fd.append('signature', sig.signature)
      fd.append('folder', sig.folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
        { method: 'POST', body: fd }
      )
      const data = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(data?.error?.message ?? 'Upload thất bại')

      setAwardAttachments(prev => [...prev, {
        url: data.secure_url,
        name: file.name,
        fileType: isImage ? 'image' : 'pdf',
      }])
      showNotification('success', `Đã tải lên: ${file.name}`)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Upload thất bại')
    } finally {
      setUploadingFile(false)
    }
  }

  function removeAttachment(idx: number) {
    setAwardAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleAddAward(e: React.FormEvent) {
    e.preventDefault()
    if (!awardIssuer.trim() || !awardContent.trim()) return
    setAddingAward(true)
    try {
      const res = await fetch('/api/teacher/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: awardType,
          issuingLevel: awardIssuer.trim(),
          content: awardContent.trim(),
          year: awardYear,
          decisionNumber: awardDecisionNumber.trim() || undefined,
          decisionDate: awardDecisionDate || undefined,
          attachmentUrls: awardAttachments,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Thêm khen thưởng thất bại')
      }
      setAwardIssuer('')
      setAwardContent('')
      setAwardDecisionNumber('')
      setAwardDecisionDate('')
      setAwardAttachments([])
      await fetchAll()
      showNotification('success', 'Đã thêm khen thưởng')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setAddingAward(false)
    }
  }

  async function handleDeleteAward(id: string) {
    if (!confirm('Xóa khen thưởng này?')) return
    try {
      const res = await fetch(`/api/teacher/awards/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Xóa thất bại')
      await fetchAll()
      showNotification('success', 'Đã xóa khen thưởng')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 text-sm">Đang tải...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Thành tích</h2>
          <p className="text-sm text-gray-500 mt-1">Nhập và quản lý thành tích theo năm học</p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <span className="text-xs text-gray-400">Đang cập nhật...</span>}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            data-testid="year-selector"
          >
            {years.map(y => (
              <option key={y} value={y}>Năm học {y}</option>
            ))}
          </select>
        </div>
      </div>

      {notification && (
        <div
          data-testid={`notification-${notification.type}`}
          className={`px-4 py-3 rounded-md text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* ── 1. KẾT QUẢ NHIỆM VỤ ── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Kết quả nhiệm vụ năm học {selectedYear}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hoàn thành nhiệm vụ <span className="text-red-500">*</span>
          </label>
          <select
            value={taskResult}
            onChange={e => setTaskResult(e.target.value as typeof taskResult)}
            data-testid="select-taskResult"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="NOT_COMPLETED">Chưa hoàn thành</option>
            <option value="GOOD">Hoàn thành tốt (HTTốt)</option>
            <option value="EXCELLENT">Hoàn thành xuất sắc (HTXS)</option>
          </select>
        </div>
        <button
          onClick={handleSaveTaskResult}
          disabled={savingRecord}
          data-testid="btn-save-record"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {savingRecord ? 'Đang lưu...' : yearRecord ? 'Cập nhật' : 'Lưu kết quả'}
        </button>
      </section>

      {/* ── 2. XẾP LOẠI ĐẢNG VIÊN ── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Xếp loại đảng viên năm học {selectedYear}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Xếp loại đảng viên
          </label>
          <select
            value={partyRating}
            onChange={e => setPartyRating(e.target.value as typeof partyRating)}
            data-testid="select-partyRating"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Không phải đảng viên</option>
            <option value="GOOD">Đảng viên hoàn thành tốt</option>
            <option value="EXCELLENT">Đảng viên hoàn thành xuất sắc</option>
          </select>
        </div>
        <button
          onClick={handleSavePartyRating}
          disabled={savingParty || !yearRecord}
          data-testid="btn-save-party"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {savingParty ? 'Đang lưu...' : 'Lưu xếp loại'}
        </button>
        {!yearRecord && (
          <p className="mt-2 text-xs text-amber-600">Cần lưu kết quả nhiệm vụ trước</p>
        )}
      </section>

      {/* ── 3. SKKN ── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          SKKN năm học {selectedYear}
        </h3>

        {yearSkkns.length > 0 && (
          <div className="mb-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {yearSkkns.map(s => (
              <div key={s.id}>
                {editingSkknId === s.id ? (
                  <div className="px-4 py-3 bg-blue-50 space-y-2">
                    <input
                      type="text"
                      value={editSkknTitle}
                      onChange={e => setEditSkknTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={editSkknLevel}
                        onChange={e => setEditSkknLevel(e.target.value as typeof editSkknLevel)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="SCHOOL">Cấp trường</option>
                        <option value="DISTRICT">Cấp phường</option>
                        <option value="CITY">Cấp tỉnh/TP</option>
                      </select>
                      <input
                        type="text"
                        value={editSkknRating}
                        onChange={e => setEditSkknRating(e.target.value)}
                        placeholder="Xếp loại"
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleSaveSkkn(s.id)}
                        disabled={savingSkkn || !editSkknTitle.trim() || !editSkknRating.trim()}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingSkkn ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        onClick={() => setEditingSkknId(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-2"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between px-4 py-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {LEVEL_LABELS[s.level]} · Xếp loại: {s.rating}
                        {s.status === 'USED' && (
                          <span className="ml-2 text-amber-600">
                            (Đã dùng cho: {s.usedFor} — {s.usedYear})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        s.status === 'UNUSED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.status === 'UNUSED' ? 'Chưa dùng' : 'Đã dùng'}
                      </span>
                      {s.status === 'UNUSED' && (
                        <>
                          <button
                            onClick={() => startEditSkkn(s)}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteSkkn(s.id)}
                            className="text-xs text-red-600 hover:text-red-700 hover:underline"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddSkkn} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên SKKN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={skknTitle}
              onChange={e => setSkknTitle(e.target.value)}
              placeholder="Ví dụ: Ứng dụng GeoGebra trong dạy học Hình học lớp 10"
              data-testid="input-skkn-title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cấp công nhận</label>
              <select
                value={skknLevel}
                onChange={e => setSkknLevel(e.target.value as typeof skknLevel)}
                data-testid="select-skkn-level"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="SCHOOL">Cấp trường</option>
                <option value="DISTRICT">Cấp phường</option>
                <option value="CITY">Cấp tỉnh/TP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Xếp loại</label>
              <input
                type="text"
                value={skknRating}
                onChange={e => setSkknRating(e.target.value)}
                placeholder="Tốt / Khá / Xuất sắc"
                data-testid="input-skkn-rating"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingSkkn || !skknTitle.trim() || !skknRating.trim()}
                data-testid="btn-add-skkn"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {addingSkkn ? 'Đang thêm...' : '+ Thêm SKKN'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ── 4. DANH HIỆU THI ĐUA ── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Danh hiệu thi đua</h3>

        {yearRecord && yearRecord.competitionTitles.length > 0 && (
          <div className="mb-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {yearRecord.competitionTitles.map(t => (
              <div key={t.id}>
                {editingTitleId === t.id ? (
                  <div className="px-4 py-3 bg-blue-50 space-y-2">
                    <div className="flex gap-2 flex-wrap items-end">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Danh hiệu</label>
                        <select
                          value={editTitleDanhHieuId}
                          onChange={e => setEditTitleDanhHieuId(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                        >
                          {danhHieus.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      {!isCSTD(danhHieus.find(d => d.id === editTitleDanhHieuId)?.name ?? '') && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Cấp</label>
                          <select
                            value={editTitleLevel}
                            onChange={e => setEditTitleLevel(e.target.value as typeof editTitleLevel)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                          >
                            <option value="SCHOOL">Cấp trường</option>
                            <option value="DISTRICT">Cấp phường</option>
                            <option value="CITY">Cấp tỉnh/TP</option>
                          </select>
                        </div>
                      )}
                      <button
                        onClick={() => handleSaveTitle(t.id)}
                        disabled={savingTitle || !editTitleDanhHieuId}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingTitle ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        onClick={() => setEditingTitleId(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-2"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="text-sm text-gray-800">
                      <span className="font-medium">
                        {t.danhHieu?.name ?? danhHieus.find(d => d.id === t.danhHieuId)?.name ?? t.danhHieuId}
                      </span>
                      {t.level && <span className="text-gray-500"> — {LEVEL_LABELS[t.level]}</span>}
                      {t.achievementMethod && (
                        <span className="text-gray-400 text-xs ml-1">
                          ({t.achievementMethod === 'METHOD_1' ? 'HTXS' : 'SKKN'})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditTitle(t)}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteTitle(t.id)}
                        className="text-xs text-red-600 hover:text-red-700 hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!yearRecord && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2 mb-4">
            Cần lưu kết quả nhiệm vụ trước khi thêm danh hiệu
          </p>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Loại danh hiệu</label>
            {danhHieus.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">Admin chưa tạo danh mục danh hiệu</p>
            ) : (
              <select
                value={titleDanhHieuId}
                onChange={e => setTitleDanhHieuId(e.target.value)}
                data-testid="select-titleType"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Chọn danh hiệu --</option>
                {danhHieus.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Cấp: ẩn "Cấp trường" cho Chiến sĩ thi đua */}
          {!isCSTDSelected && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cấp</label>
              <select
                value={titleLevel}
                onChange={e => setTitleLevel(e.target.value as typeof titleLevel)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="SCHOOL">Cấp trường</option>
                <option value="DISTRICT">Cấp phường</option>
                <option value="CITY">Cấp tỉnh/TP</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-600 mb-1">Cách đạt</label>
            <select
              value={titleMethod}
              onChange={e => setTitleMethod(e.target.value as typeof titleMethod)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Không chọn</option>
              <option value="METHOD_1">HTXS</option>
              <option value="METHOD_2">SKKN</option>
            </select>
          </div>

          <button
            onClick={handleAddTitle}
            disabled={addingTitle || !yearRecord || !titleDanhHieuId}
            data-testid="btn-add-title"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {addingTitle ? 'Đang thêm...' : '+ Thêm danh hiệu'}
          </button>
        </div>
      </section>

      {/* ── SKKN MODAL ── */}
      {skknModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" data-testid="skkn-modal">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Chọn SKKN để tiêu
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                SKKN được chọn sẽ bị đánh dấu đã dùng sau khi xác nhận
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {modalLoading && !modalSKKNsLoading ? (
                <p className="text-sm text-gray-500">Đang tải...</p>
              ) : modalRules.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Chưa có quy tắc nào được cấu hình. Liên hệ Admin.
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quy tắc danh hiệu áp dụng
                    </label>
                    <select
                      value={modalRuleId}
                      onChange={e => { prevRuleIdRef.current = ''; setModalRuleId(e.target.value) }}
                      data-testid="modal-select-rule"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {modalRules.map(r => (
                        <option key={r.id} value={r.id}>{r.targetTitle}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKKN đủ điều kiện
                    </label>
                    {modalSKKNsLoading ? (
                      <p className="text-sm text-gray-400">Đang tải SKKN...</p>
                    ) : modalSKKNs.length === 0 ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Không có SKKN nào đủ điều kiện cho quy tắc này trong năm học {selectedYear}
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        {modalSKKNs.map(s => (
                          <li key={s.id}>
                            <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={modalSelectedIds.has(s.id)}
                                onChange={() => toggleModalSKKN(s.id)}
                                className="mt-0.5 w-4 h-4 text-blue-600"
                                data-testid={`modal-skkn-${s.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                                <p className="text-xs text-gray-500">
                                  {s.academicYear} · {LEVEL_LABELS[s.level] ?? s.level} · {s.rating}
                                </p>
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {modalError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {modalError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setSkknModalOpen(false)}
                className="border px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSKKNConsume}
                disabled={modalLoading || modalSelectedIds.size === 0 || modalRules.length === 0}
                data-testid="btn-confirm-consume"
                className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {modalLoading ? 'Đang xử lý...' : `Xác nhận (${modalSelectedIds.size} SKKN)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. KHEN THƯỞNG ── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Khen thưởng</h3>

        {yearAwards.length > 0 && (
          <div className="mb-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {yearAwards.map(a => {
              const typeLabel = a.type === 'CERTIFICATE' ? 'Giấy khen' : a.type === 'COMMENDATION' ? 'Bằng khen' : 'Giấy chứng nhận'
              const attachments: Attachment[] = Array.isArray(a.attachmentUrls) ? a.attachmentUrls : []
              return (
                <div key={a.id}>
                  {editingAwardId === a.id ? (
                    <div className="px-4 py-3 bg-blue-50 space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={editAwardType}
                          onChange={e => setEditAwardType(e.target.value as typeof editAwardType)}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                        >
                          <option value="CERTIFICATE">Giấy khen</option>
                          <option value="COMMENDATION">Bằng khen</option>
                          <option value="CERTIFICATE_OF_MERIT">Giấy chứng nhận</option>
                        </select>
                        <input
                          type="text"
                          value={editAwardYear}
                          onChange={e => setEditAwardYear(e.target.value)}
                          maxLength={4}
                          placeholder="Năm"
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <input
                        type="text"
                        value={editAwardIssuer}
                        onChange={e => setEditAwardIssuer(e.target.value)}
                        placeholder="Cơ quan khen thưởng"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={editAwardContent}
                        onChange={e => setEditAwardContent(e.target.value)}
                        placeholder="Nội dung khen thưởng"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={editAwardDecisionNumber}
                          onChange={e => setEditAwardDecisionNumber(e.target.value)}
                          placeholder="Số QĐ (tùy chọn)"
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1 min-w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={editAwardDecisionDate}
                          onChange={e => setEditAwardDecisionDate(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveAward(a.id)}
                          disabled={savingAward || !editAwardIssuer.trim() || !editAwardContent.trim()}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingAward ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                          onClick={() => setEditingAwardId(null)}
                          className="text-sm text-gray-500 hover:text-gray-700 px-2"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.content}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {typeLabel} · {a.issuingLevel} · Năm {a.year}
                          {a.decisionNumber && <> · Số QĐ: {a.decisionNumber}</>}
                          {a.decisionDate && <> · {new Date(a.decisionDate).toLocaleDateString('vi-VN')}</>}
                        </p>
                        {attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {attachments.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">
                                {att.fileType === 'pdf' ? '📄' : '🖼️'} {att.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditAward(a)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteAward(a.id)}
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <form onSubmit={handleAddAward} className="space-y-3">
          {/* Row 1: loại + năm */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Hình thức</label>
              <select
                value={awardType}
                onChange={e => setAwardType(e.target.value as typeof awardType)}
                data-testid="select-award-type"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="CERTIFICATE">Giấy khen</option>
                <option value="COMMENDATION">Bằng khen</option>
                <option value="CERTIFICATE_OF_MERIT">Giấy chứng nhận</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Năm</label>
              <input
                type="text"
                value={awardYear}
                onChange={e => setAwardYear(e.target.value)}
                placeholder="2025"
                maxLength={4}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
              />
            </div>
          </div>

          {/* Row 2: cơ quan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cơ quan khen thưởng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={awardIssuer}
              onChange={e => setAwardIssuer(e.target.value)}
              placeholder="BGH Trường / UBND Phường / Sở GD-ĐT..."
              data-testid="input-award-issuer"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Row 3: nội dung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung khen thưởng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={awardContent}
              onChange={e => setAwardContent(e.target.value)}
              placeholder="Ví dụ: GV tiêu biểu xuất sắc năm học 2024-2025"
              data-testid="input-award-content"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Row 4: số QĐ + ngày QĐ */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-44">
              <label className="block text-xs text-gray-600 mb-1">Số quyết định</label>
              <input
                type="text"
                value={awardDecisionNumber}
                onChange={e => setAwardDecisionNumber(e.target.value)}
                placeholder="VD: 123/QĐ-UBND"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ngày ra quyết định</label>
              <input
                type="date"
                value={awardDecisionDate}
                onChange={e => setAwardDecisionDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Row 5: minh chứng */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Minh chứng (PDF, ảnh — tối đa 10 MB/file)</label>
            <div className="flex items-center gap-2">
              <label className={`cursor-pointer inline-flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                <span>{uploadingFile ? 'Đang tải lên...' : '📎 Chọn file'}</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="sr-only"
                  onChange={handleUploadFile}
                  disabled={uploadingFile}
                />
              </label>
              <span className="text-xs text-gray-400">PDF hoặc ảnh JPG/PNG</span>
            </div>
            {awardAttachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {awardAttachments.map((att, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded">
                    {att.fileType === 'pdf' ? '📄' : '🖼️'}
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="hover:underline max-w-32 truncate">{att.name}</a>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-red-500 hover:text-red-700 ml-0.5">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={addingAward || !awardIssuer.trim() || !awardContent.trim()}
            data-testid="btn-add-award"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {addingAward ? 'Đang thêm...' : '+ Thêm khen thưởng'}
          </button>
        </form>
      </section>
    </div>
  )
}
