export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'

// POST /api/admin/teachers/check-emails
// Body: { emails: string[] }
// Response: { exists: string[] }
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  if (!body?.emails || !Array.isArray(body.emails)) {
    return NextResponse.json({ error: 'emails array required' }, { status: 400 })
  }

  const emails: string[] = body.emails.filter((e: unknown) => typeof e === 'string')

  const found = await db.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  })

  return NextResponse.json({ exists: found.map(u => u.email) })
}
