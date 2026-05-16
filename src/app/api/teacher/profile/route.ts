export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-helpers'

// GET /api/teacher/profile — own profile
export async function GET() {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  return NextResponse.json({
    id: teacherProfile.id,
    fullName: teacherProfile.fullName,
    dateOfBirth: teacherProfile.dateOfBirth,
    department: teacherProfile.department,
    teachingSince: teacherProfile.teachingSince,
    isPartyMember: teacherProfile.isPartyMember,
    partyJoinDate: teacherProfile.partyJoinDate,
  })
}
