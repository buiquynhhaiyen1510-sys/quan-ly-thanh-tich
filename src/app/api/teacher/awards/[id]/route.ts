export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

const updateSchema = z.object({
  type: z.enum(['CERTIFICATE', 'COMMENDATION', 'CERTIFICATE_OF_MERIT']).optional(),
  issuingLevel: z.string().min(1).optional(),
  content: z.string().min(3).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  decisionNumber: z.string().optional().nullable(),
  decisionDate: z.string().optional().nullable(),
})

// PATCH /api/teacher/awards/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const award = await db.award.findUnique({ where: { id: params.id } })
  if (!award || award.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'Award not found' }, { status: 404 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { decisionDate, ...rest } = parsed.data
  const updated = await db.award.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(decisionDate !== undefined ? { decisionDate: decisionDate ? new Date(decisionDate) : null } : {}),
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/teacher/awards/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const award = await db.award.findUnique({ where: { id: params.id } })
  if (!award || award.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'Award not found' }, { status: 404 })
  }

  await db.award.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Đã xóa khen thưởng' })
}
