'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'

interface CompetitionTitle {
  id: string
  type: string
  level: string | null
  achievementMethod: string | null
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
  usedFor: string | null
  usedYear: string | null
}

interface Award {
  id: string
  type: string
  issuingLevel: string
  content: string
  year: string
}

const TITLE_LABELS: Record<string, string> = {
  CHIEN_SI_THI_DUA: 'Chiến sĩ thi đua',
  GV_GIOI: 'Giáo viên giỏi',
  GV_CN_GIOI: 'GV chủ nhiệm giỏi',
}
const LEVEL_LABELS: Record<string, string> = {
  SCHOOL: 'Cấp trường',
  DISTRICT: 'Cấp phường',
  CITY: 'Cấp tỉnh/TP',
}
const TASK_LABELS: Record<string, string> = { NOT_COMPLETED: 'Chưa hoàn thành', GOOD: 'HTTốt', EXCELLENT: 'HTXS' }

interface Department {
  id: string
  name: string
}

interface TeacherDetail {
  id: string
  email: string
  isActive: boolean
  createdAt: string
  teacherProfile: {
    id: string
    fullName: string
    dateOfBirth: string | null
    department: string
    teachingSince: number
    isPartyMember: boolean
    partyJoinDate: string | null
  } | null
}

interface EditForm {
  fullName: string
  dateOfBirth: string
  department: string
  teachingSince: string
  isPartyMember: boolean
  partyJoinDate: string
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10)
}

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [achievements, setAchievements] = useState<{
    yearlyRecords: YearlyRecord[]
    skkns: SKKN[]
    awards: Award[]
  } | null>(null)
  const [achievementsLoading, setAchievementsLoading] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: '',
    dateOfBirth: '',
    department: '',
    teachingSince: '',
    isPartyMember: false,
    partyJoinDate: '',
  })
  const [saveLoading, setSaveLoading] = useState(false)

  const [departments, setDepartments] = useState<Department[]>([])
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  async function fetchTeacher() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/teachers/${id}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Không tìm thấy giáo viên')
        throw new Error('Không thể tải thông tin giáo viên')
      }
      const data: TeacherDetail = await res.json()
      setTeacher(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAchievements() {
    setAchievementsLoading(true)
    try {
      const res = await fetch(`/api/admin/teachers/${id}/achievements`)
      if (res.ok) setAchievements(await res.json())
    } catch {
      // non-critical
    } finally {
      setAchievementsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchTeacher()
      fetchAchievements()
    }
    fetch('/api/admin/departments')
      .then(r => r.json())
      .then(setDepartments)
      .catch(() => {})
  }, [id])

  function startEdit() {
    if (!teacher) return
    setEditForm({
      fullName: teacher.teacherProfile?.fullName ?? '',
      dateOfBirth: toDateInputValue(teacher.teacherProfile?.dateOfBirth),
      department: teacher.teacherProfile?.department ?? '',
      teachingSince: String(teacher.teacherProfile?.teachingSince ?? ''),
      isPartyMember: teacher.teacherProfile?.isPartyMember ?? false,
      partyJoinDate: toDateInputValue(teacher.teacherProfile?.partyJoinDate),
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function handleEditChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setEditForm((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === 'isPartyMember' && !checked ? { partyJoinDate: '' } : {}),
      }))
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSave() {
    if (!teacher) return
    setSaveLoading(true)
    try {
      const body = {
        fullName: editForm.fullName,
        dateOfBirth: editForm.dateOfBirth || null,
        department: editForm.department,
        teachingSince: parseInt(editForm.teachingSince, 10),
        isPartyMember: editForm.isPartyMember,
        partyJoinDate:
          editForm.isPartyMember && editForm.partyJoinDate
            ? editForm.partyJoinDate
            : null,
      }
      const res = await fetch(`/api/admin/teachers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Lưu thất bại')
      }
      await fetchTeacher()
      setEditing(false)
      showNotification('success', 'Đã lưu thông tin giáo viên')
    } catch (err) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Có lỗi xảy ra'
      )
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleDeactivate() {
    if (!teacher) return
    setDeactivateLoading(true)
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Vô hiệu hóa thất bại')
      }
      setDeactivateDialogOpen(false)
      showNotification('success', 'Đã vô hiệu hóa tài khoản')
      await fetchTeacher()
    } catch (err) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Có lỗi xảy ra'
      )
    } finally {
      setDeactivateLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetPassword || resetPassword.length < 6) {
      showNotification('error', 'Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setResetLoading(true)
    try {
      const res = await fetch(`/api/admin/teachers/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Reset mật khẩu thất bại')
      }
      setResetPassword('')
      showNotification('success', 'Reset mật khẩu thành công')
    } catch (err) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Có lỗi xảy ra'
      )
    } finally {
      setResetLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 text-sm">Đang tải...</span>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-red-600 text-sm">{error ?? 'Không tìm thấy'}</span>
        <Link href="/admin/teachers" className="text-blue-600 underline text-sm">
          Quay lại danh sách
        </Link>
      </div>
    )
  }

  const profile = teacher.teacherProfile

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/teachers" className="hover:text-blue-600 transition-colors">
          Giáo viên
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {profile?.fullName ?? teacher.email}
        </span>
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

      {/* Profile card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Thông tin giáo viên</h2>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={startEdit}
                data-testid="btn-edit"
                className="border px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  data-testid="btn-save"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {saveLoading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  onClick={cancelEdit}
                  data-testid="btn-cancel-edit"
                  className="border px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Họ tên */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Họ tên
            </label>
            {editing ? (
              <input
                type="text"
                name="fullName"
                value={editForm.fullName}
                onChange={handleEditChange}
                data-testid="edit-fullName"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900 font-medium">
                {profile?.fullName ?? '—'}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Email
            </label>
            <p className="text-sm text-gray-900">{teacher.email}</p>
          </div>

          {/* Ngày sinh */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Ngày sinh
            </label>
            {editing ? (
              <input
                type="date"
                name="dateOfBirth"
                value={editForm.dateOfBirth}
                onChange={handleEditChange}
                data-testid="edit-dateOfBirth"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {formatDate(profile?.dateOfBirth)}
              </p>
            )}
          </div>

          {/* Tổ chuyên môn */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Tổ chuyên môn
            </label>
            {editing ? (
              <select
                name="department"
                value={editForm.department}
                onChange={handleEditChange}
                data-testid="edit-department"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Chọn tổ</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-900">{profile?.department ?? '—'}</p>
            )}
          </div>

          {/* Năm vào nghề */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Năm vào nghề
            </label>
            {editing ? (
              <input
                type="number"
                name="teachingSince"
                value={editForm.teachingSince}
                onChange={handleEditChange}
                min={1980}
                max={new Date().getFullYear()}
                data-testid="edit-teachingSince"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-900">
                {profile?.teachingSince ?? '—'}
              </p>
            )}
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Trạng thái
            </label>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                teacher.isActive
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {teacher.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Đảng viên */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Đảng viên
            </label>
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isPartyMember"
                    id="edit-isPartyMember"
                    checked={editForm.isPartyMember}
                    onChange={handleEditChange}
                    data-testid="edit-isPartyMember"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="edit-isPartyMember"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Là đảng viên
                  </label>
                </div>
                {editForm.isPartyMember && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Ngày kết nạp đảng
                    </label>
                    <input
                      type="date"
                      name="partyJoinDate"
                      value={editForm.partyJoinDate}
                      onChange={handleEditChange}
                      data-testid="edit-partyJoinDate"
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-900">
                  {profile?.isPartyMember ? 'Có' : 'Không'}
                </p>
                {profile?.isPartyMember && profile.partyJoinDate && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ngày kết nạp: {formatDate(profile.partyJoinDate)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Ngày tạo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Ngày tạo tài khoản
            </label>
            <p className="text-sm text-gray-900">{formatDate(teacher.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Deactivate section */}
      {teacher.isActive && (
        <div className="bg-white rounded-lg border border-red-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Vô hiệu hóa tài khoản
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Tài khoản sẽ không thể đăng nhập sau khi bị vô hiệu hóa.
          </p>
          <Dialog.Root open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
            <Dialog.Trigger asChild>
              <button
                data-testid="btn-deactivate"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium transition-colors"
              >
                Vô hiệu hóa tài khoản
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
              <Dialog.Content
                className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6"
                data-testid="deactivate-confirm-dialog"
              >
                <Dialog.Title className="text-lg font-semibold text-gray-900 mb-3">
                  Xác nhận vô hiệu hóa
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mb-6">
                  Bạn có chắc chắn muốn vô hiệu hóa tài khoản của{' '}
                  <strong>{profile?.fullName ?? teacher.email}</strong>? Giáo viên
                  sẽ không thể đăng nhập cho đến khi được kích hoạt lại.
                </Dialog.Description>
                <div className="flex gap-3 justify-end">
                  <Dialog.Close
                    data-testid="cancel-deactivate"
                    className="border px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  >
                    Hủy
                  </Dialog.Close>
                  <button
                    onClick={handleDeactivate}
                    disabled={deactivateLoading}
                    data-testid="confirm-deactivate"
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {deactivateLoading ? 'Đang xử lý...' : 'Vô hiệu hóa'}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      )}

      {/* Reset password section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Reset mật khẩu
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Đặt mật khẩu mới cho giáo viên này.
        </p>
        <form onSubmit={handleResetPassword} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              data-testid="input-reset-password"
              placeholder="Tối thiểu 6 ký tự"
              minLength={6}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button
            type="submit"
            disabled={resetLoading || resetPassword.length < 6}
            data-testid="btn-submit-reset-password"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {resetLoading ? 'Đang xử lý...' : 'Reset mật khẩu'}
          </button>
        </form>
      </div>

      {/* Achievements section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Lịch sử thành tích</h3>

        {achievementsLoading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : !achievements ? null : (
          <>
            {/* SKKN */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                SKKN ({achievements.skkns.length})
              </h4>
              {achievements.skkns.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có SKKN nào</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {achievements.skkns.map(s => (
                    <div key={s.id} className="flex items-start justify-between px-4 py-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {LEVEL_LABELS[s.level] ?? s.level} · {s.rating} · Năm {s.academicYear}
                          {s.status === 'USED' && (
                            <span className="ml-2 text-amber-600">
                              → Đã dùng cho: {s.usedFor} ({s.usedYear})
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                        s.status === 'UNUSED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.status === 'UNUSED' ? 'Chưa dùng' : 'Đã dùng'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Yearly records */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Kết quả theo năm ({achievements.yearlyRecords.length} năm)
              </h4>
              {achievements.yearlyRecords.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có dữ liệu năm học nào</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {achievements.yearlyRecords.map(r => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{r.academicYear}</span>
                        <span className="text-xs text-gray-500">{TASK_LABELS[r.taskResult] ?? r.taskResult}</span>
                      </div>
                      {r.competitionTitles.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {r.competitionTitles.map((t, i) => (
                            <span key={t.id}>
                              {i > 0 && ' · '}
                              {TITLE_LABELS[t.type] ?? t.type}
                              {t.level ? ` (${LEVEL_LABELS[t.level] ?? t.level})` : ''}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Awards */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Khen thưởng ({achievements.awards.length})
              </h4>
              {achievements.awards.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có khen thưởng nào</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {achievements.awards.map(a => (
                    <div key={a.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.content}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {a.type === 'CERTIFICATE' ? 'Giấy khen' : 'Bằng khen'} · {a.issuingLevel} · Năm {a.year}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
