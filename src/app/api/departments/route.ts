export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-helpers'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  return NextResponse.json(departments)
}
