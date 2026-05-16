export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

const createSchema = z.object({
  title: z.string().min(3, 'Tên SKKN phải có ít nhất 3 ký tự'),
  level: z.enum(['SCHOOL', 'DISTRICT', 'CITY']),
  rating: z.string().min(1),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format: 2024-2025'),
})

// GET /api/teacher/skkn
export async function GET() {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const skkns = await db.sKKN.findMany({
    where: { teacherId: teacherProfile.id },
    orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(skkns)
}

// POST /api/teacher/skkn
export async function POST(request: NextRequest) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const skkn = await db.sKKN.create({
    data: {
      teacherId: teacherProfile.id,
      title: parsed.data.title,
      level: parsed.data.level,
      rating: parsed.data.rating,
      academicYear: parsed.data.academicYear,
      status: 'UNUSED',
    },
  })

  return NextResponse.json(skkn, { status: 201 })
}
