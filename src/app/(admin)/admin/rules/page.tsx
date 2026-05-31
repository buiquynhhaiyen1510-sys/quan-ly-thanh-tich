'use client'

import { useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface YearConstraint {
  type: 'CURRENT_YEAR' | 'WITHIN_N_YEARS' | 'ANY'
  n?: number
}

interface Condition {
  type: 'SKKN' | 'COMPETITION_TITLE' | 'AWARD' | 'TASK_RESULT'
  minCount: number
  statusRequired: 'UNUSED' | 'ANY'
  yearConstraint: YearConstraint
  consumeAfterEval: boolean
  legalNote?: string
  taskResults?: ('GOOD' | 'EXCELLENT')[]
  minLevel?: 'SCHOOL' | 'DISTRICT' | 'CITY'
  titleType?: 'CHIEN_SI_THI_DUA' | 'GV_GIOI' | 'GV_CN_GIOI'
  titleLevel?: 'SCHOOL' | 'DISTRICT' | 'CITY'
  awardType?: 'CERTIFICATE' | 'COMMENDATION' | 'CERTIFICATE_OF_MERIT'
}

interface ConditionGroup {
  label?: string
  conditions: Condition[]
}

interface EligibilityConditions {
  anyOf: ConditionGroup[]
}

interface Rule {
  id: string
  targetTitle: string
  danhHieuId: string | null
  conditions: EligibilityConditions | Condition[] // supports legacy flat array
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface DanhHieu {
  id: string
  name: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeConds(raw: Rule['conditions']): EligibilityConditions {
  if (Array.isArray(raw)) return { anyOf: [{ label: 'Điều kiện', conditions: raw }] }
  return raw as EligibilityConditions
}

const EMPTY_CONDITION: Condition = {
  type: 'SKKN',
  minCount: 1,
  statusRequired: 'UNUSED',
  yearConstraint: { type: 'CURRENT_YEAR' },
  consumeAfterEval: false,
  legalNote: '',
}

const EMPTY_GROUP: ConditionGroup = {
  label: '',
  conditions: [{ ...EMPTY_CONDITION }],
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  SKKN: 'SKKN',
  COMPETITION_TITLE: 'Danh hiệu thi đua',
  AWARD: 'Khen thưởng',
  TASK_RESULT: 'Kết quả nhiệm vụ',
}

// ── ConditionEditor ───────────────────────────────────────────────────────────

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
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Điều kiện {index + 1}
        </span>
        <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-600">
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

        {/* Year constraint */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Khoảng năm</label>
          <select
            value={yc.type}
            onChange={e => {
              const t = e.target.value as YearConstraint['type']
              const next: YearConstraint = t === 'WITHIN_N_YEARS' ? { type: t, n: 2 } : { type: t }
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
                onChange({ ...condition, yearConstraint: { type: 'WITHIN_N_YEARS', n: parseInt(e.target.value, 10) || 1 } })
              }
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
        )}

        {/* SKKN-specific */}
        {condition.type === 'SKKN' && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Trạng thái SKKN</label>
              <select
                value={condition.statusRequired}
                onChange={e => onChange({ ...condition, statusRequired: e.target.value as 'UNUSED' | 'ANY' })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="UNUSED">Chưa dùng</option>
                <option value="ANY">Bất kỳ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cấp SKKN tối thiểu</label>
              <select
                value={condition.minLevel ?? ''}
                onChange={e =>
                  onChange({ ...condition, minLevel: (e.target.value || undefined) as Condition['minLevel'] })
                }
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Không giới hạn</option>
                <option value="SCHOOL">Cấp trường trở lên</option>
                <option value="DISTRICT">Cấp phường trở lên</option>
                <option value="CITY">Cấp tỉnh/TP</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id={`consume-${index}`}
                checked={condition.consumeAfterEval}
                onChange={e => onChange({ ...condition, consumeAfterEval: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor={`consume-${index}`} className="text-xs text-gray-700">
                Tiêu SKKN khi xét duyệt
              </label>
            </div>
          </>
        )}

        {/* TASK_RESULT-specific */}
        {condition.type === 'TASK_RESULT' && (
          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Kết quả yêu cầu</label>
            <div className="flex gap-4">
              {(['GOOD', 'EXCELLENT'] as const).map(val => {
                const checked = (condition.taskResults ?? []).includes(val)
                return (
                  <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const cur = condition.taskResults ?? []
                        const next = e.target.checked ? [...cur, val] : cur.filter(v => v !== val)
                        onChange({ ...condition, taskResults: next.length > 0 ? next : undefined })
                      }}
                      className="w-4 h-4"
                    />
                    {val === 'GOOD' ? 'Hoàn thành tốt' : 'Hoàn thành xuất sắc'}
                  </label>
                )
              })}
              <span className="text-xs text-gray-400 self-center">(không chọn = bất kỳ)</span>
            </div>
          </div>
        )}

        {/* COMPETITION_TITLE-specific */}
        {condition.type === 'COMPETITION_TITLE' && (
          <>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Loại danh hiệu</label>
              <select
                value={condition.titleType ?? ''}
                onChange={e => onChange({ ...condition, titleType: (e.target.value || undefined) as Condition['titleType'] })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Bất kỳ loại nào</option>
                <option value="CHIEN_SI_THI_DUA">Chiến sĩ thi đua (CSTĐ)</option>
                <option value="GV_GIOI">Giáo viên giỏi</option>
                <option value="GV_CN_GIOI">GV chủ nhiệm giỏi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cấp danh hiệu</label>
              <select
                value={condition.titleLevel ?? ''}
                onChange={e => onChange({ ...condition, titleLevel: (e.target.value || undefined) as Condition['titleLevel'] })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Bất kỳ cấp nào</option>
                <option value="SCHOOL">Cấp trường</option>
                <option value="DISTRICT">Cấp phường</option>
                <option value="CITY">Cấp tỉnh/TP</option>
              </select>
            </div>
          </>
        )}

        {/* AWARD-specific */}
        {condition.type === 'AWARD' && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Loại khen thưởng</label>
            <select
              value={condition.awardType ?? ''}
              onChange={e => onChange({ ...condition, awardType: (e.target.value || undefined) as Condition['awardType'] })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="">Bất kỳ loại nào</option>
              <option value="CERTIFICATE">Giấy khen</option>
              <option value="COMMENDATION">Bằng khen</option>
              <option value="CERTIFICATE_OF_MERIT">Bằng khen Thủ tướng/Nhà nước</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Ghi chú pháp lý</label>
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

// ── GroupEditor ───────────────────────────────────────────────────────────────

function GroupEditor({
  group,
  groupIndex,
  totalGroups,
  onChange,
  onRemove,
}: {
  group: ConditionGroup
  groupIndex: number
  totalGroups: number
  onChange: (g: ConditionGroup) => void
  onRemove: () => void
}) {
  function updateCondition(idx: number, c: Condition) {
    const next = [...group.conditions]
    next[idx] = c
    onChange({ ...group, conditions: next })
  }

  function removeCondition(idx: number) {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) })
  }

  function addCondition() {
    onChange({ ...group, conditions: [...group.conditions, { ...EMPTY_CONDITION }] })
  }

  return (
    <div className="border-2 border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
            Nhóm {groupIndex + 1} {totalGroups > 1 ? '(HOẶC)' : ''}
          </span>
          <input
            type="text"
            value={group.label ?? ''}
            onChange={e => onChange({ ...group, label: e.target.value })}
            placeholder={`Cách ${groupIndex + 1}...`}
            className="border border-blue-300 bg-white rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        {totalGroups > 1 && (
          <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-600 font-medium">
            Xóa nhóm
          </button>
        )}
      </div>

      <p className="text-xs text-blue-600">
        Tất cả điều kiện trong nhóm này phải đồng thời thỏa mãn (AND)
      </p>

      <div className="space-y-3">
        {group.conditions.map((cond, idx) => (
          <ConditionEditor
            key={idx}
            condition={cond}
            index={idx}
            onChange={c => updateCondition(idx, c)}
            onRemove={() => removeCondition(idx)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addCondition}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-300 rounded px-3 py-1.5 hover:bg-blue-100"
      >
        + Thêm điều kiện vào nhóm
      </button>
    </div>
  )
}

// ── RulesPage ─────────────────────────────────────────────────────────────────

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [danhHieus, setDanhHieus] = useState<DanhHieu[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDanhHieuId, setFormDanhHieuId] = useState('')
  const [formGroups, setFormGroups] = useState<ConditionGroup[]>([{ ...EMPTY_GROUP }])
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
      const [rRes, dRes] = await Promise.all([
        fetch('/api/admin/rules'),
        fetch('/api/admin/danh-hieu'),
      ])
      if (rRes.ok) setRules(await rRes.json())
      if (dRes.ok) setDanhHieus(await dRes.json())
    } catch {
      showNotification('error', 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRules() }, [])

  function openCreate() {
    setEditingRule(null)
    setFormTitle('')
    setFormDanhHieuId('')
    setFormGroups([{ label: 'Cách 1', conditions: [{ ...EMPTY_CONDITION }] }])
    setFormActive(true)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule)
    setFormTitle(rule.targetTitle)
    setFormDanhHieuId(rule.danhHieuId ?? '')
    setFormGroups(normalizeConds(rule.conditions).anyOf.map(g => ({
      label: g.label ?? '',
      conditions: g.conditions.map(c => ({ ...c })),
    })))
    setFormActive(rule.isActive)
    setFormError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingRule(null)
  }

  function updateGroup(idx: number, g: ConditionGroup) {
    const next = [...formGroups]
    next[idx] = g
    setFormGroups(next)
  }

  function removeGroup(idx: number) {
    setFormGroups(prev => prev.filter((_, i) => i !== idx))
  }

  function addGroup() {
    setFormGroups(prev => [
      ...prev,
      { label: `Cách ${prev.length + 1}`, conditions: [{ ...EMPTY_CONDITION }] },
    ])
  }

  async function handleSave() {
    if (!formTitle.trim()) { setFormError('Tên danh hiệu là bắt buộc'); return }
    if (formGroups.length === 0) { setFormError('Cần ít nhất 1 nhóm điều kiện'); return }
    for (const g of formGroups) {
      if (g.conditions.length === 0) { setFormError('Mỗi nhóm phải có ít nhất 1 điều kiện'); return }
    }

    setSaving(true)
    setFormError(null)
    try {
      const body = {
        targetTitle: formTitle.trim(),
        danhHieuId: formDanhHieuId || undefined,
        conditions: {
          anyOf: formGroups.map(g => ({
            label: g.label?.trim() || undefined,
            conditions: g.conditions.map(c => ({
              ...c,
              legalNote: c.legalNote?.trim() || undefined,
              taskResults: c.taskResults?.length ? c.taskResults : undefined,
              minLevel: c.minLevel || undefined,
            })),
          })),
        },
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
    await fetch(`/api/admin/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    await fetchRules()
  }

  async function handleDelete(rule: Rule) {
    if (!confirm(`Xóa quy tắc "${rule.targetTitle}"?`)) return
    await fetch(`/api/admin/rules/${rule.id}`, { method: 'DELETE' })
    await fetchRules()
    showNotification('success', 'Đã xóa quy tắc')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quy tắc xét danh hiệu</h2>
          <p className="text-sm text-gray-500 mt-1">Cấu hình điều kiện xét duyệt — hỗ trợ nhiều cách đạt (OR giữa các nhóm, AND trong mỗi nhóm)</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Tạo quy tắc
          </button>
        )}
      </div>

      {notification && (
        <div className={`px-4 py-3 rounded text-sm ${notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {notification.message}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900">
            {editingRule ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'}
          </h3>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên danh hiệu *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="vd: Chiến sĩ thi đua cơ sở"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gắn với danh mục danh hiệu</label>
              <select
                value={formDanhHieuId}
                onChange={e => {
                  const id = e.target.value
                  setFormDanhHieuId(id)
                  if (id && !formTitle) {
                    const dh = danhHieus.find(d => d.id === id)
                    if (dh) setFormTitle(dh.name)
                  }
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">(Không gắn)</option>
                {danhHieus.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* OR groups */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900">Các cách đạt danh hiệu</span>
              {formGroups.length > 1 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {formGroups.length} cách — thỏa 1 trong {formGroups.length} là đủ (OR)
                </span>
              )}
            </div>

            {formGroups.map((group, idx) => (
              <GroupEditor
                key={idx}
                group={group}
                groupIndex={idx}
                totalGroups={formGroups.length}
                onChange={g => updateGroup(idx, g)}
                onRemove={() => removeGroup(idx)}
              />
            ))}

            <button
              type="button"
              onClick={addGroup}
              className="w-full border-2 border-dashed border-orange-300 text-orange-600 rounded-xl py-3 text-sm font-medium hover:bg-orange-50"
            >
              + Thêm cách đạt khác (HOẶC)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="formActive"
              checked={formActive}
              onChange={e => setFormActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="formActive" className="text-sm text-gray-700">Kích hoạt ngay</label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : editingRule ? 'Cập nhật' : 'Tạo quy tắc'}
            </button>
            <button
              onClick={cancelForm}
              className="border border-gray-300 text-gray-700 px-5 py-2 rounded text-sm font-medium hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Rule list */}
      {loading ? (
        <p className="text-sm text-gray-500">Đang tải...</p>
      ) : rules.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-10 text-center text-sm text-gray-500">
          Chưa có quy tắc nào. Nhấn &quot;Tạo quy tắc&quot; để bắt đầu.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const conds = normalizeConds(rule.conditions)
            const totalGroups = conds.anyOf.length
            const totalConds = conds.anyOf.reduce((s, g) => s + g.conditions.length, 0)
            return (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{rule.targetTitle}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {rule.isActive ? 'Đang dùng' : 'Tắt'}
                      </span>
                      {totalGroups > 1 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          {totalGroups} cách (OR)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {totalGroups} nhóm · {totalConds} điều kiện · cập nhật {new Date(rule.updatedAt).toLocaleDateString('vi-VN')}
                    </p>
                    {/* Groups summary */}
                    <div className="mt-3 space-y-2">
                      {conds.anyOf.map((group, gi) => (
                        <div key={gi} className="bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            {group.label || `Cách ${gi + 1}`}
                            {totalGroups > 1 && gi < totalGroups - 1 && (
                              <span className="ml-2 text-orange-500 font-bold">HOẶC</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.conditions.map((c, ci) => (
                              <span key={ci} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600">
                                {ci > 0 && <span className="text-blue-500 font-bold mr-1">VÀ</span>}
                                {c.minCount > 0 ? `${c.minCount}x ` : ''}
                                {c.type === 'TASK_RESULT' ? 'KQ nhiệm vụ' : c.type === 'SKKN' ? 'SKKN' : c.type === 'COMPETITION_TITLE' ? 'Danh hiệu' : 'Khen thưởng'}
                                {c.type === 'TASK_RESULT' && c.taskResults?.length
                                  ? ` (${c.taskResults.map(r => r === 'GOOD' ? 'HTTốt' : 'HTXS').join('/')})`
                                  : ''}
                                {c.type === 'SKKN' && c.minLevel ? ` cấp ${c.minLevel === 'SCHOOL' ? 'trường' : c.minLevel === 'DISTRICT' ? 'phường' : 'tỉnh'}+` : ''}
                                {c.type === 'COMPETITION_TITLE' && c.titleType ? ` (${c.titleType === 'CHIEN_SI_THI_DUA' ? 'CSTĐ' : c.titleType === 'GV_GIOI' ? 'GV Giỏi' : 'GV CN Giỏi'})` : ''}
                                {c.type === 'COMPETITION_TITLE' && c.titleLevel ? ` cấp ${c.titleLevel === 'SCHOOL' ? 'trường' : c.titleLevel === 'DISTRICT' ? 'phường' : 'tỉnh'}` : ''}
                                {c.type === 'AWARD' && c.awardType ? ` (${c.awardType === 'CERTIFICATE' ? 'Giấy khen' : c.awardType === 'COMMENDATION' ? 'Bằng khen' : 'Bằng khen TT'})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      {rule.isActive ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      onClick={() => openEdit(rule)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
