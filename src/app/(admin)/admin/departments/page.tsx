'use client'

import { useEffect, useState } from 'react'

interface Department {
  id: string
  name: string
  order: number
  isActive: boolean
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function fetchDepartments() {
    const res = await fetch('/api/admin/departments')
    if (res.ok) setDepartments(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchDepartments() }, [])

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      showMessage('error', 'Vui lòng nhập tên tổ chuyên môn')
      return
    }
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), order: departments.length }),
    })
    if (res.ok) {
      setNewName('')
      fetchDepartments()
      showMessage('success', 'Đã thêm tổ chuyên môn')
    } else {
      const data = await res.json()
      showMessage('error', data.error || 'Có lỗi xảy ra')
    }
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingName.trim() }),
    })
    if (res.ok) {
      setEditingId(null)
      fetchDepartments()
      showMessage('success', 'Đã cập nhật')
    } else {
      showMessage('error', 'Có lỗi xảy ra')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa tổ "${name}"? Các giáo viên thuộc tổ này vẫn giữ nguyên.`)) return
    const res = await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchDepartments()
      showMessage('success', 'Đã xóa tổ chuyên môn')
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tổ chuyên môn</h2>
        <p className="text-gray-500 text-sm mt-1">Quản lý danh sách tổ chuyên môn trong trường</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Form thêm mới */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Tên tổ chuyên môn, ví dụ: Tổ Toán - Tin"
          data-testid="input-new-department"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          data-testid="btn-add-department"
        >
          Thêm tổ
        </button>
      </form>

      {/* Danh sách */}
      {loading ? (
        <p className="text-gray-500 text-sm">Đang tải...</p>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">Chưa có tổ chuyên môn nào</p>
          <p className="text-gray-400 text-sm mt-1">Thêm tổ đầu tiên bằng form bên trên</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {departments.map((dept, index) => (
            <div
              key={dept.id}
              className={`flex items-center justify-between px-4 py-3 ${index !== 0 ? 'border-t border-gray-100' : ''}`}
              data-testid={`department-row-${dept.id}`}
            >
              {editingId === dept.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(dept.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none"
                  />
                  <button onClick={() => handleUpdate(dept.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Lưu</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:text-gray-700">Hủy</button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-800">{dept.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditingId(dept.id); setEditingName(dept.name) }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                      data-testid={`btn-edit-${dept.id}`}
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="text-sm text-red-600 hover:text-red-700"
                      data-testid={`btn-delete-${dept.id}`}
                    >
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
