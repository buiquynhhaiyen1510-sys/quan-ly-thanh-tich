export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-helpers'
import { changePasswordSchema } from '@/lib/validations/teacher'

// POST /api/teacher/change-password
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { currentPassword, newPassword } = parsed.data

  // Fetch user with passwordHash
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Verify current password
  const valid = await compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  // Prevent setting the same password
  const isSame = await compare(newPassword, user.passwordHash)
  if (isSame) {
    return NextResponse.json(
      { error: 'New password must differ from current password' },
      { status: 400 },
    )
  }

  const passwordHash = await hash(newPassword, 12)

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  })

  return NextResponse.json({ message: 'Password changed successfully' })
}
