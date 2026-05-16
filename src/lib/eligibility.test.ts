// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    sKKN: { findMany: vi.fn() },
    yearlyRecord: { findMany: vi.fn() },
    award: { findMany: vi.fn() },
    teacherProfile: { findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
    eligibilityRule: { findUniqueOrThrow: vi.fn() },
  },
}))

import { db } from '@/lib/db'
import {
  checkTeacherEligibility,
  runEligibilityCheck,
  type ConditionResult,
} from '@/lib/eligibility'
import type { EligibilityRule } from '@prisma/client'
import type { ConditionInput } from '@/lib/validations/eligibility-rule'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRule(conditions: ConditionInput[], overrides: Partial<EligibilityRule> = {}): EligibilityRule {
  return {
    id: 'rule-1',
    targetTitle: 'Chiến sĩ thi đua cơ sở',
    danhHieuId: null,
    conditions: conditions as unknown as import('@prisma/client').Prisma.JsonValue,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

const skknMock = vi.mocked(db.sKKN.findMany)
const yearlyMock = vi.mocked(db.yearlyRecord.findMany)
const awardMock = vi.mocked(db.award.findMany)
const profileMock = vi.mocked(db.teacherProfile.findUniqueOrThrow)
const profilesMock = vi.mocked(db.teacherProfile.findMany)
const ruleMock = vi.mocked(db.eligibilityRule.findUniqueOrThrow)

beforeEach(() => {
  vi.clearAllMocks()
  profileMock.mockResolvedValue({ fullName: 'Nguyễn Văn A' } as any)
})

// ── SKKN condition ────────────────────────────────────────────────────────────

describe('checkTeacherEligibility — SKKN condition', () => {
  const skknCondition: ConditionInput = {
    type: 'SKKN',
    minCount: 1,
    statusRequired: 'UNUSED',
    yearConstraint: { type: 'ANY' },
    consumeAfterEval: false,
  }

  it('met when enough SKKN found', async () => {
    skknMock.mockResolvedValue([{ id: 'skkn-1', academicYear: '2024-2025' }] as any)
    const rule = makeRule([skknCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(true)
    expect(result.conditions[0].met).toBe(true)
    expect(result.conditions[0].found).toBe(1)
  })

  it('not met when no SKKN found', async () => {
    skknMock.mockResolvedValue([])
    const rule = makeRule([skknCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(false)
    expect(result.conditions[0].met).toBe(false)
    expect(result.conditions[0].found).toBe(0)
  })

  it('filters SKKN by CURRENT_YEAR constraint', async () => {
    skknMock.mockResolvedValue([
      { id: 'a', academicYear: '2024-2025' },
      { id: 'b', academicYear: '2023-2024' },
    ] as any)
    const condition: ConditionInput = {
      ...skknCondition,
      yearConstraint: { type: 'CURRENT_YEAR' },
    }
    const rule = makeRule([condition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].found).toBe(1)
  })

  it('filters SKKN by WITHIN_N_YEARS constraint', async () => {
    skknMock.mockResolvedValue([
      { id: 'a', academicYear: '2024-2025' },
      { id: 'b', academicYear: '2023-2024' },
      { id: 'c', academicYear: '2020-2021' },
    ] as any)
    const condition: ConditionInput = {
      ...skknCondition,
      yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
    }
    const rule = makeRule([condition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].found).toBe(2)
  })

  it('willConsume is populated when consumeAfterEval is true', async () => {
    skknMock.mockResolvedValue([
      { id: 'skkn-1', academicYear: '2024-2025' },
      { id: 'skkn-2', academicYear: '2023-2024' },
    ] as any)
    const condition: ConditionInput = {
      ...skknCondition,
      minCount: 1,
      consumeAfterEval: true,
    }
    const rule = makeRule([condition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].willConsume).toHaveLength(1)
    expect(result.conditions[0].willConsume[0]).toBe('skkn-1')
  })

  it('willConsume is empty when consumeAfterEval is false', async () => {
    skknMock.mockResolvedValue([{ id: 'skkn-1', academicYear: '2024-2025' }] as any)
    const rule = makeRule([skknCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].willConsume).toHaveLength(0)
  })

  it('queries UNUSED only when statusRequired is UNUSED', async () => {
    skknMock.mockResolvedValue([])
    const rule = makeRule([skknCondition])

    await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(skknMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'UNUSED' }) })
    )
  })

  it('does not filter status when statusRequired is ANY', async () => {
    skknMock.mockResolvedValue([])
    const condition: ConditionInput = { ...skknCondition, statusRequired: 'ANY' }
    const rule = makeRule([condition])

    await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(skknMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: expect.anything() }),
      })
    )
  })
})

// ── COMPETITION_TITLE condition ───────────────────────────────────────────────

describe('checkTeacherEligibility — COMPETITION_TITLE condition', () => {
  const titleCondition: ConditionInput = {
    type: 'COMPETITION_TITLE',
    minCount: 2,
    statusRequired: 'ANY',
    yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
    consumeAfterEval: false,
  }

  it('met when enough competition titles found', async () => {
    yearlyMock.mockResolvedValue([
      { academicYear: '2024-2025', competitionTitles: [{ id: 'ct-1' }, { id: 'ct-2' }] },
    ] as any)
    const rule = makeRule([titleCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(true)
    expect(result.conditions[0].found).toBe(2)
  })

  it('only counts titles in years matching constraint', async () => {
    yearlyMock.mockResolvedValue([
      { academicYear: '2024-2025', competitionTitles: [{ id: 'ct-1' }] },
      { academicYear: '2020-2021', competitionTitles: [{ id: 'ct-2' }, { id: 'ct-3' }] },
    ] as any)
    const rule = makeRule([titleCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    // Only 2024-2025 qualifies; 2020-2021 is out of WITHIN_N_YEARS n=2
    expect(result.conditions[0].found).toBe(1)
    expect(result.eligible).toBe(false)
  })

  it('willConsume is always empty for COMPETITION_TITLE', async () => {
    yearlyMock.mockResolvedValue([
      { academicYear: '2024-2025', competitionTitles: [{ id: 'ct-1' }, { id: 'ct-2' }] },
    ] as any)
    const rule = makeRule([titleCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].willConsume).toEqual([])
  })
})

// ── AWARD condition ───────────────────────────────────────────────────────────

describe('checkTeacherEligibility — AWARD condition', () => {
  const awardCondition: ConditionInput = {
    type: 'AWARD',
    minCount: 1,
    statusRequired: 'ANY',
    yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
    consumeAfterEval: false,
  }

  it('met when enough awards found', async () => {
    awardMock.mockResolvedValue([{ id: 'award-1' }] as any)
    const rule = makeRule([awardCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(true)
    expect(result.conditions[0].found).toBe(1)
  })

  it('passes calendar years derived from academic year range to DB query', async () => {
    awardMock.mockResolvedValue([])
    const rule = makeRule([awardCondition])

    await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    // WITHIN_N_YEARS n=2 from 2024-2025 → ["2024-2025","2023-2024"] → start years ["2024","2023"]
    expect(awardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          year: { in: expect.arrayContaining(['2024', '2023']) },
        }),
      })
    )
  })

  it('passes no year filter when yearConstraint is ANY', async () => {
    awardMock.mockResolvedValue([])
    const condition: ConditionInput = { ...awardCondition, yearConstraint: { type: 'ANY' } }
    const rule = makeRule([condition])

    await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(awardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ year: expect.anything() }),
      })
    )
  })

  it('uses CURRENT_YEAR start year for CURRENT_YEAR constraint', async () => {
    awardMock.mockResolvedValue([])
    const condition: ConditionInput = {
      ...awardCondition,
      yearConstraint: { type: 'CURRENT_YEAR' },
    }
    const rule = makeRule([condition])

    await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(awardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ year: { in: ['2024'] } }),
      })
    )
  })
})

// ── TASK_RESULT condition ─────────────────────────────────────────────────────

describe('checkTeacherEligibility — TASK_RESULT condition', () => {
  const taskCondition: ConditionInput = {
    type: 'TASK_RESULT',
    minCount: 1,
    statusRequired: 'ANY',
    yearConstraint: { type: 'CURRENT_YEAR' },
    consumeAfterEval: false,
  }

  it('met when a yearly record exists in current year', async () => {
    yearlyMock.mockResolvedValue([{ academicYear: '2024-2025' }] as any)
    const rule = makeRule([taskCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(true)
    expect(result.conditions[0].found).toBe(1)
  })

  it('not met when no record in current year', async () => {
    yearlyMock.mockResolvedValue([{ academicYear: '2023-2024' }] as any)
    const rule = makeRule([taskCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(false)
    expect(result.conditions[0].found).toBe(0)
  })

  it('willConsume is always empty for TASK_RESULT', async () => {
    yearlyMock.mockResolvedValue([{ academicYear: '2024-2025' }] as any)
    const rule = makeRule([taskCondition])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].willConsume).toEqual([])
  })
})

// ── Multiple conditions ───────────────────────────────────────────────────────

describe('checkTeacherEligibility — multiple conditions', () => {
  it('eligible only when ALL conditions are met', async () => {
    skknMock.mockResolvedValue([{ id: 'skkn-1', academicYear: '2024-2025' }] as any)
    yearlyMock.mockResolvedValue([{ academicYear: '2024-2025' }] as any)

    const rule = makeRule([
      {
        type: 'TASK_RESULT',
        minCount: 1,
        statusRequired: 'ANY',
        yearConstraint: { type: 'CURRENT_YEAR' },
        consumeAfterEval: false,
      },
      {
        type: 'SKKN',
        minCount: 1,
        statusRequired: 'UNUSED',
        yearConstraint: { type: 'ANY' },
        consumeAfterEval: false,
      },
    ])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(true)
    expect(result.conditions).toHaveLength(2)
    expect(result.conditions.every(c => c.met)).toBe(true)
  })

  it('ineligible when at least one condition is not met', async () => {
    skknMock.mockResolvedValue([]) // SKKN condition fails
    yearlyMock.mockResolvedValue([{ academicYear: '2024-2025' }] as any)

    const rule = makeRule([
      {
        type: 'TASK_RESULT',
        minCount: 1,
        statusRequired: 'ANY',
        yearConstraint: { type: 'CURRENT_YEAR' },
        consumeAfterEval: false,
      },
      {
        type: 'SKKN',
        minCount: 1,
        statusRequired: 'UNUSED',
        yearConstraint: { type: 'ANY' },
        consumeAfterEval: false,
      },
    ])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.eligible).toBe(false)
    expect(result.conditions[0].met).toBe(true)
    expect(result.conditions[1].met).toBe(false)
  })

  it('includes legalNote in ConditionResult', async () => {
    skknMock.mockResolvedValue([{ id: 's', academicYear: '2024-2025' }] as any)
    const rule = makeRule([
      {
        type: 'SKKN',
        minCount: 1,
        statusRequired: 'UNUSED',
        yearConstraint: { type: 'ANY' },
        consumeAfterEval: false,
        legalNote: 'Căn cứ Điều 25 NĐ 91',
      },
    ])

    const result = await checkTeacherEligibility('teacher-1', rule, '2024-2025')

    expect(result.conditions[0].legalNote).toBe('Căn cứ Điều 25 NĐ 91')
  })
})

// ── runEligibilityCheck ───────────────────────────────────────────────────────

describe('runEligibilityCheck', () => {
  const simpleRule = makeRule([
    {
      type: 'SKKN',
      minCount: 1,
      statusRequired: 'UNUSED',
      yearConstraint: { type: 'ANY' },
      consumeAfterEval: false,
    },
  ])

  it('splits results into eligible and ineligible', async () => {
    ruleMock.mockResolvedValue(simpleRule as any)
    profilesMock.mockResolvedValue([{ id: 'teacher-1' }, { id: 'teacher-2' }] as any)
    profileMock
      .mockResolvedValueOnce({ fullName: 'GV One' } as any)
      .mockResolvedValueOnce({ fullName: 'GV Two' } as any)
    skknMock
      .mockResolvedValueOnce([{ id: 's1', academicYear: '2024-2025' }] as any) // teacher-1: eligible
      .mockResolvedValueOnce([]) // teacher-2: ineligible

    const result = await runEligibilityCheck('rule-1', '2024-2025')

    expect(result.eligible).toHaveLength(1)
    expect(result.ineligible).toHaveLength(1)
    expect(result.eligible[0].teacherName).toBe('GV One')
    expect(result.ineligible[0].teacherName).toBe('GV Two')
  })

  it('returns correct ruleId and targetTitle', async () => {
    ruleMock.mockResolvedValue(simpleRule as any)
    profilesMock.mockResolvedValue([])

    const result = await runEligibilityCheck('rule-1', '2024-2025')

    expect(result.ruleId).toBe('rule-1')
    expect(result.targetTitle).toBe('Chiến sĩ thi đua cơ sở')
    expect(result.referenceYear).toBe('2024-2025')
  })

  it('returns empty arrays when no teachers', async () => {
    ruleMock.mockResolvedValue(simpleRule as any)
    profilesMock.mockResolvedValue([])

    const result = await runEligibilityCheck('rule-1', '2024-2025')

    expect(result.eligible).toEqual([])
    expect(result.ineligible).toEqual([])
  })

  it('processes teachers in batches without losing results', async () => {
    ruleMock.mockResolvedValue(simpleRule as any)
    // 25 teachers — should be processed in 2 batches (20 + 5)
    const teachers = Array.from({ length: 25 }, (_, i) => ({ id: `teacher-${i}` }))
    profilesMock.mockResolvedValue(teachers as any)
    profileMock.mockResolvedValue({ fullName: 'GV' } as any)
    skknMock.mockResolvedValue([{ id: 's1', academicYear: '2024-2025' }] as any)

    const result = await runEligibilityCheck('rule-1', '2024-2025')

    expect(result.eligible).toHaveLength(25)
  })
})
