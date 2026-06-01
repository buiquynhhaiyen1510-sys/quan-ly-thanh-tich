'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { CreateTeacherDialog } from '@/components/admin/CreateTeacherDialog'
import { BulkImportDialog } from '@/components/admin/BulkImportDialog'

interface Teacher {
  id: string
  email: string
  isActive: boolean
  teacherProfile: {
    id: string
    fullName: string
    department: string
    isPartyMember: boolean
  } | null
}

export default function TeachersPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [actionNotification, setActionNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  async function fetchTeachers() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/teachers')
      if (!res.ok) throw new Error('Không thể tải danh sách giáo viên')
      const data = await res.json()
      setTeachers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  const departments = useMemo(() => {
    const depts = new Set<string>()
    teachers.forEach((t) => {
      if (t.teacherProfile?.department) depts.add(t.teacherProfile.department)
    })
    return Array.from(depts).sort()
  }, [teachers])

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const name = t.teacherProfile?.fullName?.toLowerCase() ?? ''
      const email = t.email.toLowerCase()
      const q = search.toLowerCase()
      const matchesSearch = !q || name.includes(q) || email.includes(q)
      const matchesDept =
        !departmentFilter ||
        t.teacherProfile?.department === departmentFilter
      return matchesSearch && matchesDept
    })
  }, [teachers, search, departmentFilter])

  function showNotification(type: 'success' | 'error', message: string) {
    setActionNotification({ type, message })
    setTimeout(() => setActionNotification(null), 3000)
  }

  async function handleResetPassword(teacherId: string, teacherName: string) {
    const newPassword = prompt(
      `Nhập mật khẩu mới cho ${teacherName}:\n(Tối thiểu 6 ký tự)`
    )
    if (!newPassword || newPassword.length < 6) return

    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Reset mật khẩu thất bại')
      }
      showNotification('success', `Reset mật khẩu cho ${teacherName} thành công`)
    } catch (err) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Có lỗi xảy ra'
      )
    }
  }

  async function handleDeactivate(teacherId: string, teacherName: string) {
    if (!confirm(`Bạn có chắc muốn vô hiệu hóa tài khoản của ${teacherName}?`)) {
      return
    }
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Vô hiệu hóa thất bại')
      }
      showNotification('success', `Đã vô hiệu hóa tài khoản ${teacherName}`)
      fetchTeachers()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleDelete(teacherId: string, teacherName: string) {
    if (!confirm(`XÓA VĨNH VIỄN tài khoản "${teacherName}"?\n\nToàn bộ dữ liệu (SKKN, thành tích, khen thưởng) sẽ bị xóa và KHÔNG THỂ khôi phục.\n\nBấm OK để xác nhận xóa.`)) return
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Xóa thất bại')
      showNotification('success', `Đã xóa tài khoản ${teacherName}`)
      fetchTeachers()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleActivate(teacherId: string, teacherName: string) {
    if (!confirm(`Kích hoạt lại tài khoản của ${teacherName}?`)) return
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error ?? 'Kích hoạt thất bại')
      }
      showNotification('success', `Đã kích hoạt tài khoản ${teacherName}`)
      fetchTeachers()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Giáo viên</h2>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách giáo viên trong hệ thống
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 text-sm font-medium transition-colors"
          >
            Nhập từ Excel
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            data-testid="btn-add-teacher"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            + Thêm giáo viên
          </button>
        </div>
      </div>

      {actionNotification && (
        <div
          data-testid={`action-notification-${actionNotification.type}`}
          className={`px-4 py-3 rounded-md text-sm font-medium ${
            actionNotification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {actionNotification.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email..."
          data-testid="search-input"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          data-testid="department-filter"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="">Tất cả tổ chuyên môn</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            Đang tải...
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-red-600 text-sm">
            {error}
            <button
              onClick={fetchTeachers}
              className="ml-2 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            Không tìm thấy giáo viên nào
          </div>
        ) : (
          <table className="w-full border-collapse" data-testid="teachers-table">
            <thead>
              <tr className="bg-gray-50">
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Họ tên
                </th>
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Tổ chuyên môn
                </th>
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Email
                </th>
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Đảng viên
                </th>
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Trạng thái
                </th>
                <th className="bg-gray-50 text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 border-t text-sm font-medium text-gray-900">
                    {teacher.teacherProfile?.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3 border-t text-sm text-gray-600">
                    {teacher.teacherProfile?.department ?? '—'}
                  </td>
                  <td className="px-4 py-3 border-t text-sm text-gray-600">
                    {teacher.email}
                  </td>
                  <td className="px-4 py-3 border-t text-sm text-gray-600">
                    {teacher.teacherProfile?.isPartyMember ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Có
                      </span>
                    ) : (
                      <span className="text-gray-400">Không</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-t text-sm">
                    {teacher.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-t">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        data-testid={`btn-view-${teacher.id}`}
                        className="border px-3 py-1 rounded hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                      >
                        Xem
                      </Link>
                      <button
                        onClick={() =>
                          handleResetPassword(
                            teacher.id,
                            teacher.teacherProfile?.fullName ?? teacher.email
                          )
                        }
                        data-testid={`btn-reset-${teacher.id}`}
                        className="border px-3 py-1 rounded hover:bg-gray-50 text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        Reset MK
                      </button>
                      {teacher.isActive ? (
                        teacher.id !== currentUserId && (
                        <button
                          onClick={() =>
                            handleDeactivate(
                              teacher.id,
                              teacher.teacherProfile?.fullName ?? teacher.email
                            )
                          }
                          data-testid={`btn-deactivate-${teacher.id}`}
                          className="border px-3 py-1 rounded text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Vô hiệu hóa
                        </button>
                        )
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              handleActivate(
                                teacher.id,
                                teacher.teacherProfile?.fullName ?? teacher.email
                              )
                            }
                            data-testid={`btn-activate-${teacher.id}`}
                            className="border px-3 py-1 rounded text-xs font-medium text-green-600 border-green-200 hover:bg-green-50 transition-colors"
                          >
                            Kích hoạt lại
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                teacher.id,
                                teacher.teacherProfile?.fullName ?? teacher.email
                              )
                            }
                            data-testid={`btn-delete-${teacher.id}`}
                            className="border px-3 py-1 rounded text-xs font-medium text-red-700 border-red-300 hover:bg-red-50 transition-colors"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Hiển thị {filtered.length} / {teachers.length} giáo viên
      </p>

      <CreateTeacherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchTeachers}
      />

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onDone={fetchTeachers}
      />
    </div>
  )
}
