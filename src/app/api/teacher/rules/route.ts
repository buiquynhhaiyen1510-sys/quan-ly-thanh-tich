export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

// GET /api/teacher/rules — trả về các rule đang active để GV chọn khi tiêu SKKN
export async function GET() {
  const { error } = await requireTeacher()
  if (error) return error

  const rules = await db.eligibilityRule.findMany({
    where: { isActive: true },
    select: { id: true, targetTitle: true, isActive: true, danhHieuId: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(rules)
}
