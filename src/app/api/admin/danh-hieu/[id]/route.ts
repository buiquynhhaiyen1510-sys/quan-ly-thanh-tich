import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.danhHieu.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const dup = await db.danhHieu.findUnique({ where: { name: parsed.data.name } })
    if (dup) return NextResponse.json({ error: 'Tên đã tồn tại' }, { status: 409 })
  }

  const updated = await db.danhHieu.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.danhHieu.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  const updated = await db.danhHieu.update({
    where: { id: params.id },
    data: { isActive: !existing.isActive },
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.danhHieu.findUnique({
    where: { id: params.id },
    include: { _count: { select: { competitionTitles: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  if (existing._count.competitionTitles > 0) {
    return NextResponse.json(
      { error: `Không thể xóa — đang có ${existing._count.competitionTitles} danh hiệu GV sử dụng loại này` },
      { status: 409 }
    )
  }

  await db.danhHieu.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Đã xóa' })
}
