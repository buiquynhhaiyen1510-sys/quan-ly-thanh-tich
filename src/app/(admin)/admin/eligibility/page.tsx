'use client'

import { useEffect, useState } from 'react'

interface Rule {
  id: string
  targetTitle: string
  isActive: boolean
}

interface ConditionResult {
  conditionIndex: number
  conditionType: string
  met: boolean
  found: number
  needed: number
  willConsume: string[]
  legalNote?: string
}

interface TeacherResult {
  teacherId: string
  teacherName: string
  eligible: boolean
  conditions: ConditionResult[]
}

interface CheckResult {
  ruleId: string
  targetTitle: string
  referenceYear: string
  eligible: TeacherResult[]
  ineligible: TeacherResult[]
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  SKKN: 'SKKN',
  COMPETITION_TITLE: 'Danh hiệu thi đua',
  AWARD: 'Khen thưởng',
  TASK_RESULT: 'Kết quả nhiệm vụ',
}

function generateYears(): string[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const currentStart = m >= 9 ? y : y - 1
  const years: string[] = []
  for (let s = currentStart; s >= currentStart - 9; s--) {
    years.push(`${s}-${s + 1}`)
  }
  return years
}

export default function EligibilityPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const years = generateYears()

  const [loading, setLoading] = useState(false)
  const [rulesLoading, setRulesLoading] = useState(true)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIneligible, setExpandedIneligible] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/rules')
      .then(r => r.json())
      .then((data: Rule[]) => {
        const active = data.filter(r => r.isActive)
        setRules(active)
        if (active.length > 0) setSelectedRuleId(active[0].id)
        setSelectedYear(years[0])
      })
      .catch(() => {})
      .finally(() => setRulesLoading(false))
  }, [])

  async function handleCheck() {
    if (!selectedRuleId || !selectedYear) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(
        `/api/admin/eligibility?ruleId=${encodeURIComponent(selectedRuleId)}&year=${encodeURIComponent(selectedYear)}`
      )
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d?.error ?? 'Kiểm tra thất bại')
      }
      const data: CheckResult = await res.json()
      setResult(data)
      setExpandedIneligible(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(teacherId: string) {
    setExpandedIneligible(prev => {
      const next = new Set(prev)
      if (next.has(teacherId)) next.delete(teacherId)
      else next.add(teacherId)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xét duyệt tiềm năng</h2>
        <p className="text-sm text-gray-500 mt-1">
          Lọc giáo viên đủ điều kiện theo quy tắc danh hiệu
        </p>
      </div>

      {/* Filter form */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quy tắc danh hiệu
            </label>
            {rulesLoading ? (
              <div className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-400 w-64">
                Đang tải...
              </div>
            ) : rules.length === 0 ? (
              <div className="border border-amber-300 bg-amber-50 rounded-md px-3 py-2 text-sm text-amber-700 w-64">
                Chưa có quy tắc nào. Vào <a href="/admin/rules" className="underline">Quy tắc</a> để tạo.
              </div>
            ) : (
              <select
                value={selectedRuleId}
                onChange={e => setSelectedRuleId(e.target.value)}
                data-testid="select-rule"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
              >
                {rules.map(r => (
                  <option key={r.id} value={r.id}>{r.targetTitle}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Năm học xét duyệt
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              data-testid="select-year"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCheck}
            disabled={loading || !selectedRuleId || rules.length === 0}
            data-testid="btn-run-check"
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {loading ? 'Đang kiểm tra...' : 'Chạy kiểm tra'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Kết quả xét duyệt danh hiệu <strong>{result.targetTitle}</strong> — năm học <strong>{result.referenceYear}</strong>
          </p>

          {/* Eligible */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-green-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-green-800">
                Đủ điều kiện
              </h3>
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {result.eligible.length} giáo viên
              </span>
            </div>
            {result.eligible.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">Không có giáo viên nào đủ điều kiện</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {result.eligible.map((t, i) => (
                  <li key={t.teacherId} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{t.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {t.conditions.map((c, ci) => (
                        <span
                          key={ci}
                          title={c.legalNote}
                          className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-100"
                        >
                          {CONDITION_TYPE_LABELS[c.conditionType] ?? c.conditionType}: {c.found}/{c.needed}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Ineligible */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Chưa đủ điều kiện
              </h3>
              <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                {result.ineligible.length} giáo viên
              </span>
            </div>
            {result.ineligible.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">Tất cả giáo viên đều đủ điều kiện</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {result.ineligible.map((t, i) => {
                  const isExpanded = expandedIneligible.has(t.teacherId)
                  const failing = t.conditions.filter(c => !c.met)
                  return (
                    <li key={t.teacherId}>
                      <button
                        onClick={() => toggleExpand(t.teacherId)}
                        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                          <span className="text-sm font-medium text-gray-900">{t.teacherName}</span>
                          <span className="text-xs text-red-600">
                            Thiếu {failing.length} điều kiện
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 space-y-1.5 bg-gray-50">
                          {t.conditions.map((c, ci) => (
                            <div key={ci} className="flex items-start gap-2">
                              <span className={`text-xs font-medium mt-0.5 ${c.met ? 'text-green-600' : 'text-red-600'}`}>
                                {c.met ? '✓' : '✗'}
                              </span>
                              <div className="text-xs text-gray-700">
                                <span className="font-medium">{CONDITION_TYPE_LABELS[c.conditionType] ?? c.conditionType}</span>
                                {': '}
                                {c.met ? (
                                  <span className="text-green-700">Đạt ({c.found}/{c.needed})</span>
                                ) : (
                                  <span className="text-red-700">Chưa đạt ({c.found}/{c.needed} cần)</span>
                                )}
                                {c.legalNote && (
                                  <span className="block text-gray-400 mt-0.5">{c.legalNote}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
