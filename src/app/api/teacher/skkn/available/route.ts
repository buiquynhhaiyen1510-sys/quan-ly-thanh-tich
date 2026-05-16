export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'
import { getEligibleSKKNToConsume, type SKKNCondition } from '@/lib/skkn'
import type { ConditionInput } from '@/lib/validations/eligibility-rule'

// GET /api/teacher/skkn/available?ruleId=xxx&referenceYear=2024-2025
// Returns SKKN eligible for the SKKN condition of the given rule and year.
export async function GET(request: NextRequest) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const ruleId = searchParams.get('ruleId')
  const referenceYear = searchParams.get('referenceYear')

  if (!ruleId || !referenceYear) {
    return NextResponse.json({ error: 'ruleId and referenceYear are required' }, { status: 400 })
  }

  if (!/^\d{4}-\d{4}$/.test(referenceYear)) {
    return NextResponse.json({ error: 'referenceYear phải có dạng YYYY-YYYY' }, { status: 400 })
  }

  const rule = await db.eligibilityRule.findUnique({ where: { id: ruleId } })
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
  }

  const conditions = rule.conditions as ConditionInput[]
  const skknCond = conditions.find(c => c.type === 'SKKN')
  if (!skknCond) {
    return NextResponse.json([])
  }

  const eligible = await getEligibleSKKNToConsume(
    teacherProfile.id,
    skknCond as SKKNCondition,
    referenceYear
  )

  return NextResponse.json(eligible)
}
