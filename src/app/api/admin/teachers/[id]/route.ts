export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { updateTeacherSchema } from '@/lib/validations/teacher'

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

// PUT /api/admin/teachers/[id]
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

  const user = await db.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const { fullName, dateOfBirth, department, teachingSince, isPartyMember, partyJoinDate, role } = parsed.data

  const profileData = {
    fullName: fullName ?? '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    department: department ?? '',
    teachingSince: teachingSince ?? new Date().getFullYear(),
    isPartyMember: isPartyMember ?? false,
    partyJoinDate: partyJoinDate ? new Date(partyJoinDate) : null,
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: {
      ...(role ? { role } : {}),
      teacherProfile: user.teacherProfile
        ? { update: profileData }
        : { create: profileData },
    },
    include: { teacherProfile: true },
  })

  return NextResponse.json(sanitizeUser(updated as unknown as { passwordHash?: string; [key: string]: unknown }))
}

// PATCH /api/admin/teachers/[id] — deactivate / activate
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }

  if (action !== 'deactivate' && action !== 'activate') {
    return NextResponse.json({ error: 'Unknown action. Supported: deactivate, activate' }, { status: 400 })
  }

  // Không cho phép vô hiệu hóa chính tài khoản đang đăng nhập
  if (action === 'deactivate' && session?.user?.id === params.id) {
    return NextResponse.json({ error: 'Không thể vô hiệu hóa tài khoản của chính mình' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { isActive: action === 'activate' },
    include: { teacherProfile: true },
  })

  return NextResponse.json(sanitizeUser(updated as unknown as { passwordHash?: string; [key: string]: unknown }))
}

// DELETE /api/admin/teachers/[id] — xóa vĩnh viễn (chỉ tài khoản Inactive)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await requireAdmin()
  if (error) return error

  const user = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, isActive: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
  }

  if (user.isActive) {
    return NextResponse.json(
      { error: 'Chỉ có thể xóa tài khoản đã vô hiệu hóa. Vô hiệu hóa trước rồi mới xóa.' },
      { status: 400 }
    )
  }

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ message: `Đã xóa tài khoản ${user.email}` })
}
