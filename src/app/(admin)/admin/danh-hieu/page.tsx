'use client'

import { useEffect, useState } from 'react'

interface DanhHieu {
  id: string
  name: string
  description: string | null
  isActive: boolean
  order: number
  _count: { competitionTitles: number; eligibilityRules: number }
}

const EMPTY_FORM = { name: '', description: '', isActive: true, order: 0 }

export default function DanhHieuPage() {
  const [items, setItems] = useState<DanhHieu[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function notify(type: 'success' | 'error', msg: string) {
    if (type === 'success') { setSuccess(msg); setError(null) }
    else { setError(msg); setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/danh-hieu')
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(item: DanhHieu) {
    setEditId(item.id)
    setForm({ name: item.name, description: item.description ?? '', isActive: item.isActive, order: item.order })
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name.trim()) { notify('error', 'Tên danh hiệu không được để trống'); return }
    setSaving(true)
    try {
      const url = editId ? `/api/admin/danh-hieu/${editId}` : '/api/admin/danh-hieu'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, description: form.description || null }),
      })
      const data = await res.json()
      if (!res.ok) { notify('error', data.error ?? 'Có lỗi xảy ra'); return }
      notify('success', editId ? 'Đã cập nhật' : 'Đã tạo danh hiệu mới')
      cancelEdit()
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item: DanhHieu) {
    const res = await fetch(`/api/admin/danh-hieu/${item.id}`, { method: 'PATCH' })
    if (res.ok) await load()
  }

  async function handleDelete(item: DanhHieu) {
    if (!confirm(`Xóa danh hiệu "${item.name}"?`)) return
    const res = await fetch(`/api/admin/danh-hieu/${item.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { notify('error', data.error ?? 'Không thể xóa'); return }
    notify('success', 'Đã xóa')
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Danh mục danh hiệu</h2>
        <p className="text-sm text-gray-500 mt-1">Quản lý các loại danh hiệu thi đua giáo viên có thể đạt được</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded">{success}</div>}

      {/* Form tạo / sửa */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {editId ? 'Chỉnh sửa danh hiệu' : 'Thêm danh hiệu mới'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên danh hiệu *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="vd: Chiến sĩ thi đua cơ sở"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả (tuỳ chọn)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn gọn"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Thứ tự hiển thị</label>
            <input
              type="number"
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-blue-600"
              />
              Kích hoạt ngay
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm danh hiệu'}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      {/* Danh sách */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Danh sách ({items.length})
          </span>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-sm text-gray-500 text-center">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 text-sm text-gray-500 text-center">
            Chưa có danh hiệu nào. Thêm danh hiệu đầu tiên ở trên.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3 text-left font-medium">Tên danh hiệu</th>
                <th className="px-4 py-3 text-left font-medium">Mô tả</th>
                <th className="px-4 py-3 text-center font-medium">GV sử dụng</th>
                <th className="px-4 py-3 text-center font-medium">Quy tắc</th>
                <th className="px-4 py-3 text-center font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.description ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item._count.competitionTitles}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item._count.eligibilityRules}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.isActive ? 'Đang dùng' : 'Tắt'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
