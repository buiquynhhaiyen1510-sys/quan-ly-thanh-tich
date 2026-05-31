'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface CreateTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

interface FormData {
  fullName: string
  email: string
  password: string
  role: 'TEACHER' | 'ADMIN'
  dateOfBirth: string
  department: string
  teachingSince: string
  isPartyMember: boolean
  partyJoinDate: string
}

interface Department {
  id: string
  name: string
}

export function CreateTeacherDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTeacherDialogProps) {
  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'TEACHER',
    dateOfBirth: '',
    department: '',
    teachingSince: '',
    isPartyMember: false,
    partyJoinDate: '',
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/departments')
      .then(r => r.json())
      .then(setDepartments)
      .catch(() => {})
  }, [])
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === 'isPartyMember' && !checked ? { partyJoinDate: '' } : {}),
      }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setNotification(null)

    try {
      const body = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        dateOfBirth: form.dateOfBirth || null,
        department: form.department,
        teachingSince: parseInt(form.teachingSince, 10),
        isPartyMember: form.isPartyMember,
        partyJoinDate:
          form.isPartyMember && form.partyJoinDate ? form.partyJoinDate : null,
      }

      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error ?? 'Tạo giáo viên thất bại')
      }

      setNotification({ type: 'success', message: 'Tạo giáo viên thành công!' })
      setForm({
        fullName: '',
        email: '',
        password: '',
        role: 'TEACHER',
        dateOfBirth: '',
        department: '',
        teachingSince: '',
        isPartyMember: false,
        partyJoinDate: '',
      })
      setTimeout(() => {
        onCreated()
        onOpenChange(false)
        setNotification(null)
      }, 1200)
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Có lỗi xảy ra',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
          data-testid="create-teacher-dialog"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Thêm giáo viên
            </Dialog.Title>
            <Dialog.Close
              className="text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="dialog-close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Dialog.Close>
          </div>

          {notification && (
            <div
              data-testid={`notification-${notification.type}`}
              className={`mb-4 px-4 py-3 rounded-md text-sm font-medium ${
                notification.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                data-testid="input-fullName"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="off"
                data-testid="input-email"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="giaovien@truong.edu.vn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu tạm <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                data-testid="input-password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tối thiểu 8 ký tự"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="TEACHER">Giáo viên (GV)</option>
                <option value="ADMIN">Ban Giám Hiệu (BGH)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                data-testid="input-dateOfBirth"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tổ chuyên môn <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                data-testid="input-department"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Chọn tổ chuyên môn</option>
                {departments.length === 0 && (
                  <option disabled value="">Chưa có tổ nào — vào Cài đặt để thêm</option>
                )}
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Năm vào nghề <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="teachingSince"
                value={form.teachingSince}
                onChange={handleChange}
                required
                min={1980}
                max={new Date().getFullYear()}
                data-testid="input-teachingSince"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2010"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isPartyMember"
                id="isPartyMember"
                checked={form.isPartyMember}
                onChange={handleChange}
                data-testid="input-isPartyMember"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="isPartyMember"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Là đảng viên
              </label>
            </div>

            {form.isPartyMember && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kết nạp đảng
                </label>
                <input
                  type="date"
                  name="partyJoinDate"
                  value={form.partyJoinDate}
                  onChange={handleChange}
                  data-testid="input-partyJoinDate"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                data-testid="submit-create-teacher"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {loading ? 'Đang tạo...' : 'Tạo giáo viên'}
              </button>
              <Dialog.Close
                type="button"
                data-testid="cancel-create-teacher"
                className="border px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Hủy
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
