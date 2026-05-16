import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-helpers'

// GET /api/teacher/danh-hieu — active titles list (accessible by any logged-in user)
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const items = await db.danhHieu.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, isActive: true },
  })

  return NextResponse.json(items)
}
