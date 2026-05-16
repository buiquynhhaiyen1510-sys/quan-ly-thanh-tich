import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

const schema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format: 2024-2025'),
  taskResult: z.enum(['NOT_COMPLETED', 'GOOD', 'EXCELLENT']),
  partyRating: z.enum(['GOOD', 'EXCELLENT']).nullable().optional(),
})

// POST /api/teacher/yearly-record — upsert yearly record
export async function POST(request: NextRequest) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { academicYear, taskResult, partyRating } = parsed.data

  const record = await db.yearlyRecord.upsert({
    where: { teacherId_academicYear: { teacherId: teacherProfile.id, academicYear } },
    update: { taskResult, partyRating: partyRating ?? null },
    create: { teacherId: teacherProfile.id, academicYear, taskResult, partyRating: partyRating ?? null },
    include: { competitionTitles: true },
  })

  return NextResponse.json(record)
}
