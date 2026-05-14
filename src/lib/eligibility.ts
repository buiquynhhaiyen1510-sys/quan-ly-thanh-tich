import { db } from '@/lib/db'
import { generateYearRange, parseAcademicYear } from '@/lib/skkn'
import type { ConditionInput } from '@/lib/validations/eligibility-rule'
import type { EligibilityRule } from '@prisma/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConditionResult = {
  conditionIndex: number
  conditionType: 'SKKN' | 'COMPETITION_TITLE' | 'AWARD' | 'TASK_RESULT'
  met: boolean
  found: number
  needed: number
  willConsume: string[]
  legalNote?: string
}

export type TeacherEligibilityResult = {
  teacherId: string
  teacherName: string
  eligible: boolean
  conditions: ConditionResult[]
}

export type EligibilityCheckResult = {
  ruleId: string
  targetTitle: string
  referenceYear: string
  eligible: TeacherEligibilityResult[]
  ineligible: TeacherEligibilityResult[]
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function isAcademicYearInConstraint(
  academicYear: string,
  condition: ConditionInput,
  referenceYear: string
): boolean {
  const yc = condition.yearConstraint
  if (yc.type === 'ANY') return true
  if (yc.type === 'CURRENT_YEAR') return academicYear === referenceYear
  const validYears = new Set(generateYearRange(referenceYear, yc.n))
  return validYears.has(academicYear)
}

// For AWARD (calendar year "YYYY"), map academic year constraint → calendar years.
// Uses startYear of each academic year in the range.
function calendarYearsFromConstraint(
  condition: ConditionInput,
  referenceYear: string
): Set<string> | null {
  const yc = condition.yearConstraint
  if (yc.type === 'ANY') return null
  if (yc.type === 'CURRENT_YEAR') {
    return new Set([String(parseAcademicYear(referenceYear).startYear)])
  }
  const academicYears = generateYearRange(referenceYear, yc.n)
  const years = new Set<string>()
  for (const ay of academicYears) {
    years.add(String(parseAcademicYear(ay).startYear))
  }
  return years
}

// ── Condition checkers ────────────────────────────────────────────────────────

async function checkSKKN(
  teacherId: string,
  condition: ConditionInput,
  conditionIndex: number,
  referenceYear: string
): Promise<ConditionResult> {
  const skkns = await db.sKKN.findMany({
    where: {
      teacherId,
      ...(condition.statusRequired === 'UNUSED' ? { status: 'UNUSED' } : {}),
    },
    select: { id: true, academicYear: true },
  })

  const eligible = skkns.filter(s =>
    isAcademicYearInConstraint(s.academicYear, condition, referenceYear)
  )

  const willConsume =
    condition.consumeAfterEval
      ? eligible.slice(0, condition.minCount).map(s => s.id)
      : []

  return {
    conditionIndex,
    conditionType: 'SKKN',
    met: eligible.length >= condition.minCount,
    found: eligible.length,
    needed: condition.minCount,
    willConsume,
    legalNote: condition.legalNote,
  }
}

async function checkCompetitionTitle(
  teacherId: string,
  condition: ConditionInput,
  conditionIndex: number,
  referenceYear: string
): Promise<ConditionResult> {
  const records = await db.yearlyRecord.findMany({
    where: { teacherId },
    select: {
      academicYear: true,
      competitionTitles: { select: { id: true } },
    },
  })

  let found = 0
  for (const record of records) {
    if (isAcademicYearInConstraint(record.academicYear, condition, referenceYear)) {
      found += record.competitionTitles.length
    }
  }

  return {
    conditionIndex,
    conditionType: 'COMPETITION_TITLE',
    met: found >= condition.minCount,
    found,
    needed: condition.minCount,
    willConsume: [],
    legalNote: condition.legalNote,
  }
}

async function checkAward(
  teacherId: string,
  condition: ConditionInput,
  conditionIndex: number,
  referenceYear: string
): Promise<ConditionResult> {
  const calYears = calendarYearsFromConstraint(condition, referenceYear)

  const awards = await db.award.findMany({
    where: {
      teacherId,
      ...(calYears ? { year: { in: Array.from(calYears) } } : {}),
    },
    select: { id: true },
  })

  return {
    conditionIndex,
    conditionType: 'AWARD',
    met: awards.length >= condition.minCount,
    found: awards.length,
    needed: condition.minCount,
    willConsume: [],
    legalNote: condition.legalNote,
  }
}

async function checkTaskResult(
  teacherId: string,
  condition: ConditionInput,
  conditionIndex: number,
  referenceYear: string
): Promise<ConditionResult> {
  const records = await db.yearlyRecord.findMany({
    where: { teacherId },
    select: { academicYear: true },
  })

  const found = records.filter(r =>
    isAcademicYearInConstraint(r.academicYear, condition, referenceYear)
  ).length

  return {
    conditionIndex,
    conditionType: 'TASK_RESULT',
    met: found >= condition.minCount,
    found,
    needed: condition.minCount,
    willConsume: [],
    legalNote: condition.legalNote,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkTeacherEligibility(
  teacherId: string,
  rule: EligibilityRule,
  referenceYear: string
): Promise<TeacherEligibilityResult> {
  const profile = await db.teacherProfile.findUniqueOrThrow({
    where: { id: teacherId },
    select: { fullName: true },
  })

  const conditions = rule.conditions as ConditionInput[]

  const results: ConditionResult[] = await Promise.all(
    conditions.map((cond, idx) => {
      switch (cond.type) {
        case 'SKKN':
          return checkSKKN(teacherId, cond, idx, referenceYear)
        case 'COMPETITION_TITLE':
          return checkCompetitionTitle(teacherId, cond, idx, referenceYear)
        case 'AWARD':
          return checkAward(teacherId, cond, idx, referenceYear)
        case 'TASK_RESULT':
          return checkTaskResult(teacherId, cond, idx, referenceYear)
      }
    })
  )

  return {
    teacherId,
    teacherName: profile.fullName,
    eligible: results.every(r => r.met),
    conditions: results,
  }
}

const BATCH_SIZE = 20

export async function runEligibilityCheck(
  ruleId: string,
  referenceYear: string
): Promise<EligibilityCheckResult> {
  const rule = await db.eligibilityRule.findUniqueOrThrow({ where: { id: ruleId } })

  const teachers = await db.teacherProfile.findMany({
    where: { user: { isActive: true } },
    select: { id: true },
  })

  const eligible: TeacherEligibilityResult[] = []
  const ineligible: TeacherEligibilityResult[] = []

  for (let i = 0; i < teachers.length; i += BATCH_SIZE) {
    const batch = teachers.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(t => checkTeacherEligibility(t.id, rule, referenceYear))
    )
    for (const result of batchResults) {
      if (result.eligible) eligible.push(result)
      else ineligible.push(result)
    }
  }

  return {
    ruleId,
    targetTitle: rule.targetTitle,
    referenceYear,
    eligible,
    ineligible,
  }
}
