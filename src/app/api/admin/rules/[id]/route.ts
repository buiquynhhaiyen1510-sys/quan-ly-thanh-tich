import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { updateRuleSchema } from '@/lib/validations/eligibility-rule'

type RouteContext = { params: { id: string } }

// GET /api/admin/rules/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error

  const rule = await db.eligibilityRule.findUnique({ where: { id: params.id } })
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  return NextResponse.json(rule)
}

// PUT /api/admin/rules/[id] — full update
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.eligibilityRule.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const updated = await db.eligibilityRule.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.targetTitle !== undefined && { targetTitle: parsed.data.targetTitle }),
      ...(parsed.data.danhHieuId !== undefined && { danhHieuId: parsed.data.danhHieuId }),
      ...(parsed.data.conditions !== undefined && { conditions: parsed.data.conditions }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  })

  return NextResponse.json(updated)
}

// PATCH /api/admin/rules/[id] — toggle isActive
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.eligibilityRule.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = z.object({ isActive: z.boolean() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body phải có trường isActive: boolean' }, { status: 422 })
  }

  const updated = await db.eligibilityRule.update({
    where: { id: params.id },
    data: { isActive: parsed.data.isActive },
  })

  return NextResponse.json(updated)
}

// DELETE /api/admin/rules/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { error } = await requireAdmin()
  if (error) return error

  const existing = await db.eligibilityRule.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  await db.eligibilityRule.delete({ where: { id: params.id } })

  return NextResponse.json({ message: 'Đã xóa rule' })
}
