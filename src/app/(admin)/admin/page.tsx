'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  totalTeachers: number
  activeTeachers: number
  totalSKKN: number
  unusedSKKN: number
  usedSKKN: number
  activeRules: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cards = stats
    ? [
        { label: 'Tổng giáo viên', value: stats.totalTeachers, sub: `${stats.activeTeachers} đang hoạt động`, href: '/admin/teachers', color: 'blue' },
        { label: 'SKKN chưa dùng', value: stats.unusedSKKN, sub: `${stats.usedSKKN} đã tiêu / ${stats.totalSKKN} tổng`, href: '/admin/teachers', color: 'green' },
        { label: 'Quy tắc đang dùng', value: stats.activeRules, sub: 'quy tắc xét danh hiệu', href: '/admin/rules', color: 'purple' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống quản lý thành tích giáo viên</p>
      </div>

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
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map(c => (
            <Link
              key={c.label}
              href={c.href}
              className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm text-gray-500 font-medium">{c.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/admin/teachers" className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
            <p className="text-sm text-gray-500">Giáo viên</p>
            <p className="text-sm text-gray-400 mt-1">Quản lý danh sách giáo viên</p>
          </Link>
          <Link href="/admin/teachers" className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
            <p className="text-sm text-gray-500">SKKN</p>
            <p className="text-sm text-gray-400 mt-1">Theo dõi SKKN đã tiêu</p>
          </Link>
          <Link href="/admin/eligibility" className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
            <p className="text-sm text-gray-500">Xét duyệt</p>
            <p className="text-sm text-gray-400 mt-1">Lọc GV tiềm năng theo danh hiệu</p>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/admin/eligibility"
          className="p-5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-gray-900 text-sm">Xét duyệt tiềm năng</h3>
          <p className="text-xs text-gray-500 mt-1">
            Chạy engine lọc giáo viên đủ điều kiện theo quy tắc danh hiệu thi đua
          </p>
        </Link>
        <Link
          href="/admin/rules"
          className="p-5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h3 className="font-semibold text-gray-900 text-sm">Cấu hình quy tắc</h3>
          <p className="text-xs text-gray-500 mt-1">
            Thêm, sửa, bật/tắt quy tắc xét duyệt danh hiệu
          </p>
        </Link>
      </div>
    </div>
  )
}
