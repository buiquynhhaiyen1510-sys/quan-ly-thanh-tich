import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'
import { executeConsume, type SKKNCondition } from '@/lib/skkn'
import type { ConditionInput } from '@/lib/validations/eligibility-rule'

const createSchema = z.object({
  yearlyRecordId: z.string().min(1),
  type: z.enum(['CHIEN_SI_THI_DUA', 'GV_GIOI', 'GV_CN_GIOI']),
  level: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).nullable().optional(),
  achievementMethod: z.enum(['METHOD_1', 'METHOD_2']).nullable().optional(),
  // Required when achievementMethod === 'METHOD_2' and a rule is configured
  ruleId: z.string().optional(),
  skknIds: z.array(z.string()).optional(),
})

// POST /api/teacher/competition-titles
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

  // Verify yearlyRecord belongs to this teacher
  const record = await db.yearlyRecord.findUnique({ where: { id: parsed.data.yearlyRecordId } })
  if (!record || record.teacherId !== teacherProfile.id) {
    return NextResponse.json({ error: 'Yearly record not found' }, { status: 404 })
  }

  const { ruleId, skknIds, achievementMethod, ...titleData } = parsed.data
  const shouldConsume = achievementMethod === 'METHOD_2' && ruleId && skknIds && skknIds.length > 0

  if (shouldConsume) {
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
      const title = await db.$transaction(async (tx) => {
        await executeConsume(skknIds, {
          teacherId: teacherProfile.id,
          usedFor: rule.targetTitle,
          usedYear: record.academicYear,
          condition: skknCond as SKKNCondition,
          referenceYear: record.academicYear,
        }, tx)

        return tx.competitionTitle.create({
          data: {
            yearlyRecordId: titleData.yearlyRecordId,
            type: titleData.type,
            level: titleData.level ?? null,
            achievementMethod,
          },
        })
      })

      return NextResponse.json(title, { status: 201 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  // No SKKN consume — plain create
  const title = await db.competitionTitle.create({
    data: {
      yearlyRecordId: titleData.yearlyRecordId,
      type: titleData.type,
      level: titleData.level ?? null,
      achievementMethod: achievementMethod ?? null,
    },
  })

  return NextResponse.json(title, { status: 201 })
}
