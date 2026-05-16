export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

const updateSchema = z.object({
  danhHieuId: z.string().optional(),
  level: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).optional().nullable(),
})

// PATCH /api/teacher/competition-titles/[id] — sửa danh hieu/level (không đổi achievementMethod)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const title = await db.competitionTitle.findUnique({
    where: { id: params.id },
    include: { yearlyRecord: true },
  })
  if (!title || title.yearlyRecord.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'Competition title not found' }, { status: 404 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await db.competitionTitle.update({
    where: { id: params.id },
    data: parsed.data,
    include: { danhHieu: true },
  })

  return NextResponse.json(updated)
}

// DELETE /api/teacher/competition-titles/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const title = await db.competitionTitle.findUnique({
    where: { id: params.id },
    include: { yearlyRecord: true },
  })

  if (!title || title.yearlyRecord.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'Competition title not found' }, { status: 404 })
  }

  await db.competitionTitle.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Đã xóa danh hiệu' })
}
