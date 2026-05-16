export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { createRuleSchema } from '@/lib/validations/eligibility-rule'

// GET /api/admin/rules — list all rules (active first)
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const rules = await db.eligibilityRule.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(rules)
}

// POST /api/admin/rules — create a new rule
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const rule = await db.eligibilityRule.create({
    data: {
      targetTitle: parsed.data.targetTitle,
      danhHieuId: parsed.data.danhHieuId ?? null,
      conditions: parsed.data.conditions,
      isActive: parsed.data.isActive,
    },
  })

  return NextResponse.json(rule, { status: 201 })
}
