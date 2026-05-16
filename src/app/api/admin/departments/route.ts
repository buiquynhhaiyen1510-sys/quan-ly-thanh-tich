export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

const departmentSchema = z.object({
  name: z.string().min(1, 'Tên tổ không được để trống'),
  order: z.number().int().optional().default(0),
})

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const departments = await db.department.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(departments)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = departmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await db.department.findUnique({
    where: { name: parsed.data.name },
  })
  if (existing) {
    return NextResponse.json({ error: 'Tên tổ đã tồn tại' }, { status: 409 })
  }

  const department = await db.department.create({ data: parsed.data })
  return NextResponse.json(department, { status: 201 })
}
