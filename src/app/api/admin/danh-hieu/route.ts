import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

const createSchema = z.object({
  name: z.string().min(2, 'Tên danh hiệu quá ngắn'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
})

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const items = await db.danhHieu.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { competitionTitles: true, eligibilityRules: true } } },
  })

  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await db.danhHieu.findUnique({ where: { name: parsed.data.name } })
  if (existing) {
    return NextResponse.json({ error: 'Tên danh hiệu đã tồn tại' }, { status: 409 })
  }

  const item = await db.danhHieu.create({ data: parsed.data })
  return NextResponse.json(item, { status: 201 })
}
