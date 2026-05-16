'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Stats {
  totalTeachers: number
  activeTeachers: number
  totalSKKN: number
  unusedSKKN: number
  usedSKKN: number
  activeRules: number
}

interface DanhHieu {
  id: string
  name: string
  isActive: boolean
  _count: { competitionTitles: number }
}

interface RecentTeacher {
  id: string
  email: string
  isActive: boolean
  teacherProfile: { fullName: string; department: string } | null
  createdAt: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [danhHieus, setDanhHieus] = useState<DanhHieu[]>([])
  const [recentTeachers, setRecentTeachers] = useState<RecentTeacher[]>([])
  const [loading, setLoading] = useState(true)

  // Quick-create teacher form
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [qEmail, setQEmail] = useState('')
  const [qPassword, setQPassword] = useState('')
  const [qName, setQName] = useState('')
  const [qDept, setQDept] = useState('')
  const [qYear, setQYear] = useState(new Date().getFullYear() - 5)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, dRes, tRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/danh-hieu'),
          fetch('/api/admin/teachers'),
        ])
        if (sRes.ok) setStats(await sRes.json())
        if (dRes.ok) setDanhHieus(await dRes.json())
        if (tRes.ok) {
          const teachers: RecentTeacher[] = await tRes.json()
          // Sort by createdAt desc, take 5 most recent
          setRecentTeachers(
            teachers
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
          )
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!qEmail || !qPassword || !qName || !qDept) {
      setCreateError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: qEmail.trim(),
          password: qPassword,
          fullName: qName.trim(),
          department: qDept.trim(),
          teachingSince: qYear,
          isPartyMember: false,
          dateOfBirth: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? 'Tạo thất bại'); return }
      setCreateSuccess(`Đã tạo tài khoản: ${qEmail}`)
      setQEmail(''); setQPassword(''); setQName(''); setQDept('')
      // Refresh recent teachers
      const tRes = await fetch('/api/admin/teachers')
      if (tRes.ok) {
        const teachers: RecentTeacher[] = await tRes.json()
        setRecentTeachers(
          teachers
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        )
      }
      setTimeout(() => setCreateSuccess(null), 5000)
    } finally {
      setCreating(false)
    }
  }

  const statCards = stats
    ? [
        { label: 'Tổng giáo viên', value: stats.totalTeachers, sub: `${stats.activeTeachers} đang hoạt động`, href: '/admin/teachers', color: 'blue' },
        { label: 'SKKN chưa dùng', value: stats.unusedSKKN, sub: `${stats.usedSKKN} đã tiêu / ${stats.totalSKKN} tổng`, href: '/admin/teachers', color: 'green' },
        { label: 'Quy tắc đang dùng', value: stats.activeRules, sub: 'quy tắc xét danh hiệu', href: '/admin/rules', color: 'purple' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống quản lý thành tích giáo viên</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowQuickCreate(v => !v); setCreateError(null); setCreateSuccess(null) }}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            {showQuickCreate ? 'Đóng' : '+ Tạo giáo viên'}
          </button>
          <button
            onClick={() => router.push('/admin/teachers')}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
          >
            Quản lý GV
          </button>
        </div>
      </div>

      {/* Quick-create teacher form */}
      {showQuickCreate && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tạo tài khoản giáo viên nhanh</h3>
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded mb-3">{createError}</div>
          )}
          {createSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded mb-3">
              {createSuccess} — <button onClick={() => router.push('/admin/teachers')} className="underline">Xem danh sách GV</button>
            </div>
          )}
          <form onSubmit={handleQuickCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={qEmail} onChange={e => setQEmail(e.target.value)}
                placeholder="gv@tieuhoc.edu.vn" required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu *</label>
              <input type="password" value={qPassword} onChange={e => setQPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự" required minLength={8}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Họ và tên *</label>
              <input type="text" value={qName} onChange={e => setQName(e.target.value)}
                placeholder="Nguyễn Thị A" required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tổ chuyên môn *</label>
              <input type="text" value={qDept} onChange={e => setQDept(e.target.value)}
                placeholder="Tổ 3" required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Năm vào nghề</label>
              <input type="number" value={qYear} onChange={e => setQYear(parseInt(e.target.value))}
                min={1970} max={new Date().getFullYear()}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" disabled={creating}
                className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
              <button type="button" onClick={() => router.push('/admin/teachers')}
                className="text-blue-600 text-sm underline">
                Xem tất cả →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 bg-white rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {statCards.map(c => (
            <Link key={c.label} href={c.href}
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
              <p className="text-sm text-gray-500 font-medium">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent teachers */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Giáo viên mới tạo</h3>
            <Link href="/admin/teachers" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          {recentTeachers.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có giáo viên nào</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTeachers.map(t => (
                <div key={t.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.teacherProfile?.fullName ?? t.email}</p>
                    <p className="text-xs text-gray-400">{t.email} · {t.teacherProfile?.department ?? '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.isActive ? 'Hoạt động' : 'Tắt'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danh mục danh hiệu */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Danh mục danh hiệu</h3>
            <Link href="/admin/danh-hieu" className="text-xs text-blue-600 hover:underline">Quản lý →</Link>
          </div>
          {danhHieus.length === 0 ? (
            <div>
              <p className="text-sm text-gray-400 mb-3">Chưa có danh hiệu nào</p>
              <Link href="/admin/danh-hieu"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-xs font-medium hover:bg-blue-700">
                + Tạo danh mục đầu tiên
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {danhHieus.slice(0, 5).map(d => (
                <div key={d.id} className="py-2.5 flex items-center justify-between">
                  <p className="text-sm text-gray-900">{d.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{d._count.competitionTitles} GV</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.isActive ? 'Đang dùng' : 'Tắt'}
                    </span>
                  </div>
                </div>
              ))}
              {danhHieus.length > 5 && (
                <div className="pt-2">
                  <Link href="/admin/danh-hieu" className="text-xs text-blue-600 hover:underline">
                    +{danhHieus.length - 5} danh hiệu khác...
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/eligibility', label: 'Xét duyệt tiềm năng', desc: 'Lọc GV đủ điều kiện' },
          { href: '/admin/rules', label: 'Cấu hình quy tắc', desc: 'Thêm, sửa, bật/tắt' },
          { href: '/admin/danh-hieu', label: 'Danh mục danh hiệu', desc: 'Tạo loại danh hiệu mới' },
          { href: '/admin/departments', label: 'Tổ chuyên môn', desc: 'Quản lý tổ chuyên môn' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
            <p className="text-sm font-semibold text-gray-900">{a.label}</p>
            <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
