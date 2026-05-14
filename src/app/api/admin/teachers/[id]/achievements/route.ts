import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: true },
  })
  if (!user?.teacherProfile) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const teacherId = user.teacherProfile.id

  const [yearlyRecords, skkns, awards] = await Promise.all([
    db.yearlyRecord.findMany({
      where: { teacherId },
      include: { competitionTitles: true },
      orderBy: { academicYear: 'desc' },
    }),
    db.sKKN.findMany({
      where: { teacherId },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    }),
    db.award.findMany({
      where: { teacherId },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return NextResponse.json({ yearlyRecords, skkns, awards })
}
