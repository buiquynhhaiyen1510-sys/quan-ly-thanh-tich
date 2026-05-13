import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'
import { executeConsume, type SKKNCondition } from '@/lib/skkn'
import type { ConditionInput } from '@/lib/validations/eligibility-rule'

const createSchema = z.object({
  type: z.enum(['CERTIFICATE', 'COMMENDATION']),
  issuingLevel: z.string().min(1, 'Cần ghi rõ cơ quan khen thưởng'),
  content: z.string().min(3, 'Nội dung khen thưởng quá ngắn'),
  year: z.string().regex(/^\d{4}$/, 'Năm phải có dạng YYYY'),
  // Optional SKKN consume — used when the award requires SKKN (e.g. Bằng khen)
  ruleId: z.string().optional(),
  skknIds: z.array(z.string()).optional(),
  // Academic year context for SKKN rule evaluation (required when ruleId present)
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
})

// POST /api/teacher/awards
export async function POST(request: NextRequest) {
  const { teacherProfile, error } = await requireTeacher()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { ruleId, skknIds, academicYear, ...awardData } = parsed.data
  const shouldConsume = ruleId && skknIds && skknIds.length > 0

  if (shouldConsume) {
    if (!academicYear) {
      return NextResponse.json({ error: 'academicYear bắt buộc khi có ruleId' }, { status: 400 })
    }

    const rule = await db.eligibilityRule.findUnique({ where: { id: ruleId } })
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const conditions = rule.conditions as ConditionInput[]
    const skknCond = conditions.find(c => c.type === 'SKKN')
    if (!skknCond) {
      return NextResponse.json({ error: 'Rule không có điều kiện SKKN' }, { status: 400 })
    }

    try {
      const award = await db.$transaction(async (tx) => {
        await executeConsume(skknIds, {
          teacherId: teacherProfile.id,
          usedFor: rule.targetTitle,
          usedYear: academicYear,
          condition: skknCond as SKKNCondition,
          referenceYear: academicYear,
        }, tx)

        return tx.award.create({
          data: { teacherId: teacherProfile.id, ...awardData },
        })
      })

      return NextResponse.json(award, { status: 201 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  // No SKKN consume — plain create
  const award = await db.award.create({
    data: { teacherId: teacherProfile.id, ...awardData },
  })

  return NextResponse.json(award, { status: 201 })
}
