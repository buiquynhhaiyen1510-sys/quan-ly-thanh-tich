import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const [totalTeachers, activeTeachers, skknCounts, activeRules] = await Promise.all([
    db.user.count({ where: { role: 'TEACHER' } }),
    db.user.count({ where: { role: 'TEACHER', isActive: true } }),
    db.sKKN.groupBy({ by: ['status'], _count: { id: true } }),
    db.eligibilityRule.count({ where: { isActive: true } }),
  ])

  const totalSKKN = skknCounts.reduce((s, r) => s + r._count.id, 0)
  const unusedSKKN = skknCounts.find(r => r.status === 'UNUSED')?._count.id ?? 0
  const usedSKKN = skknCounts.find(r => r.status === 'USED')?._count.id ?? 0

  return NextResponse.json({
    totalTeachers,
    activeTeachers,
    totalSKKN,
    unusedSKKN,
    usedSKKN,
    activeRules,
  })
}
