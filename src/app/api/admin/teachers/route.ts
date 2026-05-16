import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { createTeacherSchema } from '@/lib/validations/teacher'

// Helper to strip passwordHash from user object
function sanitizeUser(user: { passwordHash?: string; [key: string]: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user
  return safe
}

// GET /api/admin/teachers?department=...&active=true|false
export async function GET(request: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error
  void session

  const { searchParams } = new URL(request.url)
  const department = searchParams.get('department')
  const activeParam = searchParams.get('active')

  const where: {
    isActive?: boolean
    teacherProfile?: { department?: string }
  } = {}

  if (activeParam !== null) {
    where.isActive = activeParam === 'true'
  }

  if (department) {
    where.teacherProfile = { department }
  }

  const teachers = await db.user.findMany({
    where,
    include: {
      teacherProfile: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const sanitized = teachers.map((t) => sanitizeUser(t as unknown as { passwordHash?: string; [key: string]: unknown }))
  return NextResponse.json(sanitized)
}

// POST /api/admin/teachers
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error
  void session

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createTeacherSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    email,
    password,
    role,
    fullName,
    dateOfBirth,
    department,
    teachingSince,
    isPartyMember,
    partyJoinDate,
  } = parsed.data

  // Check for duplicate email
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)

  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: role ?? 'TEACHER',
        isActive: true,
        teacherProfile: {
          create: {
            fullName,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            department,
            teachingSince,
            isPartyMember,
            partyJoinDate: partyJoinDate ? new Date(partyJoinDate) : null,
          },
        },
      },
      include: { teacherProfile: true },
    })
    return user
  })

  const safe = sanitizeUser(created as unknown as { passwordHash?: string; [key: string]: unknown })
  return NextResponse.json(safe, { status: 201 })
}
