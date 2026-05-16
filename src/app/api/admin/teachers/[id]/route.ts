export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { updateTeacherSchema } from '@/lib/validations/teacher'

// Helper to strip passwordHash from user object
function sanitizeUser(user: { passwordHash?: string; [key: string]: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user
  return safe
}

// GET /api/admin/teachers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAdmin()
  if (error) return error
  void session

  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  return NextResponse.json(sanitizeUser(user as unknown as { passwordHash?: string; [key: string]: unknown }))
}

// PUT /api/admin/teachers/[id]  — update profile fields (NOT email/password)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAdmin()
  if (error) return error
  void session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateTeacherSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // Verify user exists
  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const { fullName, dateOfBirth, department, teachingSince, isPartyMember, partyJoinDate } =
    parsed.data

  const profileData: {
    fullName?: string
    dateOfBirth?: Date | null
    department?: string
    teachingSince?: number
    isPartyMember?: boolean
    partyJoinDate?: Date | null
  } = {}

  if (fullName !== undefined) profileData.fullName = fullName
  if (dateOfBirth !== undefined) profileData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
  if (department !== undefined) profileData.department = department
  if (teachingSince !== undefined) profileData.teachingSince = teachingSince
  if (isPartyMember !== undefined) profileData.isPartyMember = isPartyMember
  if (partyJoinDate !== undefined) profileData.partyJoinDate = partyJoinDate ? new Date(partyJoinDate) : null

  const updated = await db.user.update({
    where: { id: params.id },
    data: {
      teacherProfile: {
        update: profileData,
      },
    },
    include: { teacherProfile: true },
  })

  return NextResponse.json(sanitizeUser(updated as unknown as { passwordHash?: string; [key: string]: unknown }))
}

// PATCH /api/admin/teachers/[id]  — soft delete { action: 'deactivate' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAdmin()
  if (error) return error
  void session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }

  if (action !== 'deactivate') {
    return NextResponse.json({ error: 'Unknown action. Supported: deactivate' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { isActive: false },
    include: { teacherProfile: true },
  })

  return NextResponse.json(sanitizeUser(updated as unknown as { passwordHash?: string; [key: string]: unknown }))
}
