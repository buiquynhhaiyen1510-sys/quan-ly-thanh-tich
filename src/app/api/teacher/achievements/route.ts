import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'

// GET /api/teacher/achievements — all yearly data for this teacher
export async function GET() {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const yearlyRecords = await db.yearlyRecord.findMany({
    where: { teacherId: teacherProfile.id },
    include: { competitionTitles: { include: { danhHieu: true } } },
    orderBy: { academicYear: 'desc' },
  })

  const skkns = await db.sKKN.findMany({
    where: { teacherId: teacherProfile.id },
    orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
  })

  const awards = await db.award.findMany({
    where: { teacherId: teacherProfile.id },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ yearlyRecords, skkns, awards })
}
