export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { resetPasswordSchema } from '@/lib/validations/teacher'

// POST /api/admin/teachers/[id]/reset-password
export async function POST(
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

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const user = await db.user.findUnique({ where: { id: params.id } })
  if (!user) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const passwordHash = await hash(parsed.data.newPassword, 12)

  await db.user.update({
    where: { id: params.id },
    data: { passwordHash },
  })

  return NextResponse.json({ message: 'Password reset successfully' })
}
