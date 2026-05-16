import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireTeacher } from '@/lib/api-helpers'
import { executeConsume, type SKKNCondition } from '@/lib/skkn'
import type { ConditionInput, EligibilityConditions } from '@/lib/validations/eligibility-rule'

const createSchema = z.object({
  yearlyRecordId: z.string().min(1),
  danhHieuId: z.string().min(1),              // FK to DanhHieu
  level: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).nullable().optional(),
  achievementMethod: z.enum(['METHOD_1', 'METHOD_2']).nullable().optional(),
  ruleId: z.string().optional(),               // required when METHOD_2 + SKKN consume
  skknIds: z.array(z.string()).optional(),
})

function normalizeConditions(raw: unknown): EligibilityConditions {
  if (Array.isArray(raw)) return { anyOf: [{ conditions: raw as ConditionInput[] }] }
  return raw as EligibilityConditions
}

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

  // Verify DanhHieu exists and is active
  const danhHieu = await db.danhHieu.findUnique({ where: { id: parsed.data.danhHieuId } })
  if (!danhHieu || !danhHieu.isActive) {
    return NextResponse.json({ error: 'Danh hiệu không tồn tại hoặc đã bị tắt' }, { status: 404 })
  }

  const { ruleId, skknIds, achievementMethod } = parsed.data
  const shouldConsume = achievementMethod === 'METHOD_2' && ruleId && skknIds && skknIds.length > 0

  if (shouldConsume) {
    const rule = await db.eligibilityRule.findUnique({ where: { id: ruleId } })
    if (!rule) {
      return NextResponse.json({ error: 'Rule không tìm thấy' }, { status: 404 })
    }

    const eligibilityConds = normalizeConditions(rule.conditions)
    // Find the first SKKN condition with consumeAfterEval=true across all groups
    let skknCond: ConditionInput | undefined
    outer: for (const group of eligibilityConds.anyOf) {
      for (const c of group.conditions) {
        if (c.type === 'SKKN' && c.consumeAfterEval) {
          skknCond = c
          break outer
        }
      }
    }

    if (!skknCond) {
      return NextResponse.json({ error: 'Rule không có điều kiện SKKN cần tiêu' }, { status: 400 })
    }

    try {
      const title = await db.$transaction(async (tx) => {
        await executeConsume(skknIds, {
          teacherId: teacherProfile.id,
          usedFor: danhHieu.name,
          usedYear: record.academicYear,
          condition: skknCond as SKKNCondition,
          referenceYear: record.academicYear,
        }, tx)

        return tx.competitionTitle.create({
          data: {
            yearlyRecordId: parsed.data.yearlyRecordId,
            danhHieuId: parsed.data.danhHieuId,
            level: parsed.data.level ?? null,
            achievementMethod,
          },
          include: { danhHieu: true },
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
      yearlyRecordId: parsed.data.yearlyRecordId,
      danhHieuId: parsed.data.danhHieuId,
      level: parsed.data.level ?? null,
      achievementMethod: achievementMethod ?? null,
    },
    include: { danhHieu: true },
  })

  return NextResponse.json(title, { status: 201 })
}
