'use client'

import { useEffect, useState } from 'react'

interface Condition {
  type: 'SKKN' | 'COMPETITION_TITLE' | 'AWARD' | 'TASK_RESULT'
  minCount: number
  statusRequired: 'UNUSED' | 'ANY'
  yearConstraint:
    | { type: 'CURRENT_YEAR' }
    | { type: 'WITHIN_N_YEARS'; n: number }
    | { type: 'ANY' }
  consumeAfterEval: boolean
  legalNote?: string
}

interface Rule {
  id: string
  targetTitle: string
  conditions: Condition[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const EMPTY_CONDITION: Condition = {
  type: 'SKKN',
  minCount: 1,
  statusRequired: 'UNUSED',
  yearConstraint: { type: 'CURRENT_YEAR' },
  consumeAfterEval: false,
  legalNote: '',
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  SKKN: 'SKKN',
  COMPETITION_TITLE: 'Danh hiệu thi đua',
  AWARD: 'Khen thưởng',
  TASK_RESULT: 'Kết quả nhiệm vụ',
}

function ConditionEditor({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: Condition
  index: number
  onChange: (c: Condition) => void
  onRemove: () => void
}) {
  const yc = condition.yearConstraint

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Điều kiện {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-600"
        >
          Xóa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Loại</label>
          <select
            value={condition.type}
            onChange={e => onChange({ ...condition, type: e.target.value as Condition['type'] })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            {Object.entries(CONDITION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Số lượng tối thiểu</label>
          <input
            type="number"
            min={0}
            value={condition.minCount}
            onChange={e => onChange({ ...condition, minCount: parseInt(e.target.value, 10) || 0 })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Năm học</label>
          <select
            value={yc.type}
            onChange={e => {
              const t = e.target.value as 'CURRENT_YEAR' | 'WITHIN_N_YEARS' | 'ANY'
              const next: Condition['yearConstraint'] =
                t === 'WITHIN_N_YEARS' ? { type: t, n: 2 } : { type: t }
              onChange({ ...condition, yearConstraint: next })
            }}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="CURRENT_YEAR">Năm hiện tại</option>
            <option value="WITHIN_N_YEARS">Trong N năm gần nhất</option>
            <option value="ANY">Bất kỳ năm nào</option>
          </select>
        </div>
        {yc.type === 'WITHIN_N_YEARS' && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Số năm (N)</label>
            <input
              type="number"
              min={1}
              value={yc.n}
              onChange={e =>
                onChange({
                  ...condition,
                  yearConstraint: { type: 'WITHIN_N_YEARS', n: parseInt(e.target.value, 10) || 1 },
                })
              }
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        )}
        {condition.type === 'SKKN' && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Trạng thái SKKN</label>
              <select
                value={condition.statusRequired}
                onChange={e =>
                  onChange({ ...condition, statusRequired: e.target.value as 'UNUSED' | 'ANY' })
                }
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="UNUSED">Chưa dùng</option>
                <option value="ANY">Bất kỳ</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id={`consume-${index}`}
                checked={condition.consumeAfterEval}
                onChange={e => onChange({ ...condition, consumeAfterEval: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor={`consume-${index}`} className="text-xs text-gray-700">
                Tiêu SKKN khi xét
              </label>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Ghi chú pháp lý (tùy chọn)</label>
        <input
          type="text"
          value={condition.legalNote ?? ''}
          onChange={e => onChange({ ...condition, legalNote: e.target.value })}
          placeholder="Căn cứ: Nghị định..."
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  )
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formConditions, setFormConditions] = useState<Condition[]>([{ ...EMPTY_CONDITION }])
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  async function fetchRules() {
    try {
      const res = await fetch('/api/admin/rules')
      if (!res.ok) throw new Error()
      setRules(await res.json())
    } catch {
      showNotification('error', 'Không thể tải danh sách quy tắc')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRules() }, [])

  function openCreate() {
    setEditingRule(null)
    setFormTitle('')
    setFormConditions([{ ...EMPTY_CONDITION }])
    setFormActive(true)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule)
    setFormTitle(rule.targetTitle)
    setFormConditions(rule.conditions.map(c => ({ ...c })))
    setFormActive(rule.isActive)
    setFormError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingRule(null)
  }

  async function handleSave() {
    if (!formTitle.trim()) { setFormError('Tên danh hiệu là bắt buộc'); return }
    if (formConditions.length === 0) { setFormError('Cần ít nhất 1 điều kiện'); return }

    setSaving(true)
    setFormError(null)
    try {
      const body = {
        targetTitle: formTitle.trim(),
        conditions: formConditions.map(c => ({
          ...c,
          legalNote: c.legalNote?.trim() || undefined,
        })),
        isActive: formActive,
      }

      const url = editingRule ? `/api/admin/rules/${editingRule.id}` : '/api/admin/rules'
      const method = editingRule ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Lưu thất bại')
      }
      await fetchRules()
      setShowForm(false)
      setEditingRule(null)
      showNotification('success', editingRule ? 'Đã cập nhật quy tắc' : 'Đã tạo quy tắc mới')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(rule: Rule) {
    try {
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      if (!res.ok) throw new Error()
      await fetchRules()
      showNotification('success', rule.isActive ? 'Đã tắt quy tắc' : 'Đã bật quy tắc')
    } catch {
      showNotification('error', 'Không thể thay đổi trạng thái quy tắc')
    }
  }

  async function handleDelete(rule: Rule) {
    if (!confirm(`Xóa quy tắc "${rule.targetTitle}"?`)) return
    try {
      const res = await fetch(`/api/admin/rules/${rule.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Xóa thất bại')
      }
      await fetchRules()
      showNotification('success', 'Đã xóa quy tắc')
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Xóa thất bại')
    }
  }

  function updateCondition(index: number, updated: Condition) {
    setFormConditions(prev => prev.map((c, i) => (i === index ? updated : c)))
  }

  function removeCondition(index: number) {
    setFormConditions(prev => prev.filter((_, i) => i !== index))
  }

  function addCondition() {
    setFormConditions(prev => [...prev, { ...EMPTY_CONDITION }])
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quy tắc xét duyệt</h2>
          <p className="text-sm text-gray-500 mt-1">Cấu hình điều kiện xét danh hiệu thi đua</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            data-testid="btn-create-rule"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            + Tạo quy tắc
          </button>
        )}
      </div>

      {notification && (
        <div className={`px-4 py-3 rounded-md text-sm font-medium ${
          notification.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900">
            {editingRule ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên danh hiệu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Ví dụ: Chiến sĩ thi đua cơ sở"
              data-testid="input-rule-title"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="form-isActive"
              checked={formActive}
              onChange={e => setFormActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="form-isActive" className="text-sm text-gray-700">Kích hoạt quy tắc này</label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Điều kiện xét duyệt</label>
              <button
                type="button"
                onClick={addCondition}
                className="text-sm text-blue-600 hover:underline"
              >
                + Thêm điều kiện
              </button>
            </div>
            {formConditions.map((c, i) => (
              <ConditionEditor
                key={i}
                condition={c}
                index={i}
                onChange={updated => updateCondition(i, updated)}
                onRemove={() => removeCondition(i)}
              />
            ))}
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={cancelForm}
              className="border px-4 py-2 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="btn-save-rule"
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {saving ? 'Đang lưu...' : editingRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">Đang tải...</div>
        ) : rules.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">
            Chưa có quy tắc nào. Nhấn "+ Tạo quy tắc" để bắt đầu.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map(rule => (
              <li key={rule.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{rule.targetTitle}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        rule.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rule.isActive ? 'Đang dùng' : 'Tắt'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {rule.conditions.length} điều kiện:{' '}
                      {rule.conditions.map((c, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {CONDITION_TYPE_LABELS[c.type] ?? c.type} ≥{c.minCount}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(rule)}
                      data-testid={`btn-edit-rule-${rule.id}`}
                      className="border px-3 py-1 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleToggle(rule)}
                      data-testid={`btn-toggle-rule-${rule.id}`}
                      className={`border px-3 py-1 rounded text-xs font-medium transition-colors ${
                        rule.isActive
                          ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      {rule.isActive ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      data-testid={`btn-delete-rule-${rule.id}`}
                      className="border px-3 py-1 rounded text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
