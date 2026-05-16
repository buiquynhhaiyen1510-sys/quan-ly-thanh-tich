export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') || null
  const department = searchParams.get('department') || null

  const teachers = await db.teacherProfile.findMany({
    where: {
      ...(department ? { department } : {}),
      user: { isActive: true },
    },
    include: {
      skkns: true,
      awards: true,
      yearlyRecords: {
        include: { competitionTitles: true },
        orderBy: { academicYear: 'desc' },
      },
    },
    orderBy: { fullName: 'asc' },
  })

  const [startYear, endYear] = year ? year.split('-') : [null, null]

  const result = teachers.map(t => {
    const yearlyRecord = year
      ? (t.yearlyRecords.find(r => r.academicYear === year) ?? null)
      : (t.yearlyRecords[0] ?? null)

    const skkns = year
      ? t.skkns.filter(s => s.academicYear === year)
      : t.skkns

    const awards = year
      ? t.awards.filter(a => a.year === startYear || a.year === endYear)
      : t.awards

    return {
      id: t.id,
      fullName: t.fullName,
      department: t.department,
      isPartyMember: t.isPartyMember,
      yearlyRecord,
      skkns,
      awards,
    }
  })

  return NextResponse.json(result)
}
