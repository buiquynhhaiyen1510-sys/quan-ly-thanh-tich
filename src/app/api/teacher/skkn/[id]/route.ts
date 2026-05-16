export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  level: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).optional(),
  rating: z.string().min(1).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
})

// PATCH /api/teacher/skkn/[id] — edit SKKN (only if UNUSED)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const skkn = await db.sKKN.findUnique({ where: { id: params.id } })
  if (!skkn || skkn.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'SKKN not found' }, { status: 404 })
  }
  if (skkn.status !== 'UNUSED') {
    return NextResponse.json({ error: 'Không thể sửa SKKN đã được sử dụng' }, { status: 409 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await db.sKKN.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(updated)
}

// DELETE /api/teacher/skkn/[id] — delete SKKN (only if UNUSED)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const skkn = await db.sKKN.findUnique({ where: { id: params.id } })
  if (!skkn || skkn.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'SKKN not found' }, { status: 404 })
  }
  if (skkn.status !== 'UNUSED') {
    return NextResponse.json({ error: 'Không thể xóa SKKN đã được sử dụng' }, { status: 409 })
  }

  await db.sKKN.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Đã xóa SKKN' })
}
