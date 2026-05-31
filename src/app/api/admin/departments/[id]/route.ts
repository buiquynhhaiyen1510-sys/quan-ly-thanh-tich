export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Kiểm tra tên trùng với tổ khác
  if (parsed.data.name) {
    const dup = await db.department.findFirst({
      where: { name: parsed.data.name, NOT: { id: params.id } },
    })
    if (dup) {
      return NextResponse.json({ error: 'Tên tổ đã tồn tại' }, { status: 409 })
    }
  }

  try {
    const department = await db.department.update({
      where: { id: params.id },
      data: parsed.data,
    })
    return NextResponse.json(department)
  } catch {
    return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  // Soft delete
  await db.department.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return NextResponse.json({ message: 'Đã xóa tổ chuyên môn' })
}
