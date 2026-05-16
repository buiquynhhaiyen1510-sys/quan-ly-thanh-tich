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

  const profileData = {
    fullName: fullName ?? '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    department: department ?? '',
    teachingSince: teachingSince ?? new Date().getFullYear(),
    isPartyMember: isPartyMember ?? false,
    partyJoinDate: partyJoinDate ? new Date(partyJoinDate) : null,
  }

  // Dùng upsert để xử lý cả trường hợp chưa có teacherProfile (VD: tài khoản BGH/Admin)
  const updated = await db.user.update({
    where: { id: params.id },
    data: {
      teacherProfile: user.teacherProfile
        ? { update: profileData }
        : { create: profileData },
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
