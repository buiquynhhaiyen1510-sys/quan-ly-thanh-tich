import { db } from '@/lib/db'
import { generateYearRange, parseAcademicYear } from '@/lib/skkn'
import type {
  ConditionInput,
  ConditionGroup,
  EligibilityConditions,
} from '@/lib/validations/eligibility-rule'
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

export type GroupResult = {
  groupIndex: number
  label?: string
  met: boolean                // all conditions in this group passed
  conditions: ConditionResult[]
}

export type TeacherEligibilityResult = {
  teacherId: string
  teacherName: string
  eligible: boolean           // true if at least one group passed
  groups: GroupResult[]       // one per anyOf group
  // flat conditions list (first group) kept for backward compat with export
  conditions: ConditionResult[]
}

export type EligibilityCheckResult = {
  ruleId: string
  targetTitle: string
  referenceYear: string
  eligible: TeacherEligibilityResult[]
  ineligible: TeacherEligibilityResult[]
}

// ── Normalize conditions JSON (backward compat) ───────────────────────────────

function normalizeConditions(raw: unknown): EligibilityConditions {
  if (Array.isArray(raw)) {
    // Legacy flat array → single AND group
    return { anyOf: [{ conditions: raw as ConditionInput[] }] }
  }
  return raw as EligibilityConditions
}

// ── Year helpers ──────────────────────────────────────────────────────────────

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
      // Filter by minLevel if specified (SCHOOL < DISTRICT < CITY)
      ...(condition.minLevel
        ? {
            level: {
              in: condition.minLevel === 'SCHOOL'
                ? ['SCHOOL', 'DISTRICT', 'CITY']
                : condition.minLevel === 'DISTRICT'
                ? ['DISTRICT', 'CITY']
                : ['CITY'],
            },
          }
        : {}),
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
    where: {
      teacherId,
      // Filter by specific task results if specified
      ...(condition.taskResults && condition.taskResults.length > 0
        ? { taskResult: { in: condition.taskResults } }
        : {}),
    },
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

async function evaluateGroup(
  teacherId: string,
  group: ConditionGroup,
  groupIndex: number,
  referenceYear: string
): Promise<GroupResult> {
  const condResults: ConditionResult[] = await Promise.all(
    group.conditions.map((cond, idx) => {
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
    groupIndex,
    label: group.label,
    met: condResults.every(r => r.met),
    conditions: condResults,
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

  const eligibilityConditions = normalizeConditions(rule.conditions)

  const groups: GroupResult[] = await Promise.all(
    eligibilityConditions.anyOf.map((group, idx) =>
      evaluateGroup(teacherId, group, idx, referenceYear)
    )
  )

  // Teacher is eligible if ANY group (anyOf) is fully satisfied
  const eligible = groups.some(g => g.met)

  return {
    teacherId,
    teacherName: profile.fullName,
    eligible,
    groups,
    // Flat conditions from first group for backward compat
    conditions: groups[0]?.conditions ?? [],
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
