// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { SKKN } from '@prisma/client'

// Mock db before importing skkn module
vi.mock('@/lib/db', () => ({
  db: {
    sKKN: {
      findMany: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import {
  parseAcademicYear,
  prevAcademicYear,
  generateYearRange,
  getEligibleSKKNToConsume,
  consumeSKKN,
  executeConsume,
  type SKKNCondition,
} from '@/lib/skkn'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSKKN(overrides: Partial<SKKN> = {}): SKKN {
  return {
    id: 'skkn-1',
    teacherId: 'teacher-1',
    title: 'SKKN mẫu',
    level: 'SCHOOL',
    rating: 'Tốt',
    academicYear: '2024-2025',
    status: 'UNUSED',
    usedFor: null,
    usedYear: null,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

const baseCondition: SKKNCondition = {
  type: 'SKKN',
  minCount: 1,
  statusRequired: 'UNUSED',
  yearConstraint: { type: 'ANY' },
  consumeAfterEval: true,
}

/** Creates a mock Prisma transaction with stateful SKKN data */
function makeMockTx(initialData: Record<string, SKKN>) {
  const state: Record<string, SKKN> = {}
  for (const [k, v] of Object.entries(initialData)) state[k] = { ...v }

  return {
    sKKN: {
      findUniqueOrThrow: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        const skkn = state[where.id]
        if (!skkn) {
          const err = Object.assign(new Error('Record not found'), { code: 'P2025' })
          return Promise.reject(err)
        }
        return Promise.resolve({ ...skkn })
      }),
      update: vi.fn().mockImplementation(
        ({ where, data }: { where: { id: string }; data: Partial<SKKN> }) => {
          if (state[where.id]) state[where.id] = { ...state[where.id], ...data }
          return Promise.resolve(state[where.id])
        }
      ),
    },
  }
}

// ── parseAcademicYear ─────────────────────────────────────────────────────────

describe('parseAcademicYear', () => {
  it('parses a valid year string', () => {
    expect(parseAcademicYear('2024-2025')).toEqual({ startYear: 2024, endYear: 2025 })
  })

  it('throws on wrong format', () => {
    expect(() => parseAcademicYear('2024')).toThrow()
    expect(() => parseAcademicYear('24-25')).toThrow()
    expect(() => parseAcademicYear('')).toThrow()
  })

  it('throws when years are not consecutive', () => {
    expect(() => parseAcademicYear('2023-2025')).toThrow('liên tiếp')
    expect(() => parseAcademicYear('2024-2024')).toThrow('liên tiếp')
  })
})

// ── prevAcademicYear ──────────────────────────────────────────────────────────

describe('prevAcademicYear', () => {
  it('returns the preceding academic year', () => {
    expect(prevAcademicYear('2024-2025')).toBe('2023-2024')
    expect(prevAcademicYear('2000-2001')).toBe('1999-2000')
  })
})

// ── generateYearRange ─────────────────────────────────────────────────────────

describe('generateYearRange', () => {
  it('returns only current year when n=1', () => {
    expect(generateYearRange('2024-2025', 1)).toEqual(['2024-2025'])
  })

  it('returns n years going backwards', () => {
    expect(generateYearRange('2024-2025', 3)).toEqual([
      '2024-2025',
      '2023-2024',
      '2022-2023',
    ])
  })

  it('returns empty array when n=0', () => {
    expect(generateYearRange('2024-2025', 0)).toEqual([])
  })
})

// ── getEligibleSKKNToConsume ──────────────────────────────────────────────────

describe('getEligibleSKKNToConsume', () => {
  const findManyMock = vi.mocked(db.sKKN.findMany)

  beforeEach(() => {
    findManyMock.mockReset()
  })

  it('returns SKKN that match yearConstraint ANY', async () => {
    const skkn = makeSKKN()
    findManyMock.mockResolvedValue([skkn])

    const result = await getEligibleSKKNToConsume('teacher-1', baseCondition, '2024-2025')

    expect(result).toHaveLength(1)
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teacherId: 'teacher-1', status: 'UNUSED' }) })
    )
  })

  it('filters by CURRENT_YEAR constraint', async () => {
    const skknCurrent = makeSKKN({ id: 'a', academicYear: '2024-2025' })
    const skknOld = makeSKKN({ id: 'b', academicYear: '2023-2024' })
    findManyMock.mockResolvedValue([skknCurrent, skknOld])

    const condition: SKKNCondition = {
      ...baseCondition,
      yearConstraint: { type: 'CURRENT_YEAR' },
    }
    const result = await getEligibleSKKNToConsume('teacher-1', condition, '2024-2025')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filters by WITHIN_N_YEARS constraint', async () => {
    const skknInRange = makeSKKN({ id: 'a', academicYear: '2023-2024' })
    const skknOutOfRange = makeSKKN({ id: 'b', academicYear: '2021-2022' })
    findManyMock.mockResolvedValue([skknInRange, skknOutOfRange])

    const condition: SKKNCondition = {
      ...baseCondition,
      yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
    }
    const result = await getEligibleSKKNToConsume('teacher-1', condition, '2024-2025')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('does not filter by status when statusRequired is ANY', async () => {
    const usedSKKN = makeSKKN({ status: 'USED', usedFor: 'CSTĐ', usedYear: '2023-2024' })
    findManyMock.mockResolvedValue([usedSKKN])

    const condition: SKKNCondition = { ...baseCondition, statusRequired: 'ANY' }
    await getEligibleSKKNToConsume('teacher-1', condition, '2024-2025')

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ status: expect.anything() }) })
    )
  })
})

// ── consumeSKKN ───────────────────────────────────────────────────────────────

describe('consumeSKKN', () => {
  it('marks an UNUSED SKKN as USED', async () => {
    const skkn = makeSKKN()
    const tx = makeMockTx({ 'skkn-1': skkn })

    await consumeSKKN('skkn-1', 'CSTĐ Cơ sở', '2024-2025', tx as any)

    expect(tx.sKKN.update).toHaveBeenCalledWith({
      where: { id: 'skkn-1' },
      data: { status: 'USED', usedFor: 'CSTĐ Cơ sở', usedYear: '2024-2025' },
    })
  })

  it('throws when SKKN is already USED', async () => {
    const skkn = makeSKKN({ status: 'USED', usedFor: 'Bằng khen TP', usedYear: '2023-2024' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    await expect(
      consumeSKKN('skkn-1', 'CSTĐ Cơ sở', '2024-2025', tx as any)
    ).rejects.toThrow('đã được dùng')
  })

  it('error message includes previous usedFor and usedYear', async () => {
    const skkn = makeSKKN({ status: 'USED', usedFor: 'Bằng khen TP', usedYear: '2023-2024' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    await expect(
      consumeSKKN('skkn-1', 'CSTĐ Cơ sở', '2024-2025', tx as any)
    ).rejects.toThrow('Bằng khen TP')
  })
})

// ── executeConsume ────────────────────────────────────────────────────────────

describe('executeConsume', () => {
  const opts = {
    teacherId: 'teacher-1',
    usedFor: 'CSTĐ Cơ sở',
    usedYear: '2024-2025',
    condition: baseCondition,
    referenceYear: '2024-2025',
  }

  it('consumes SKKN successfully', async () => {
    const skkn = makeSKKN()
    const tx = makeMockTx({ 'skkn-1': skkn })

    await executeConsume(['skkn-1'], opts, tx as any)

    expect(tx.sKKN.update).toHaveBeenCalled()
  })

  it('throws when fewer SKKNs selected than minCount', async () => {
    const skkn = makeSKKN()
    const tx = makeMockTx({ 'skkn-1': skkn })

    const condition: SKKNCondition = { ...baseCondition, minCount: 2 }
    await expect(
      executeConsume(['skkn-1'], { ...opts, condition }, tx as any)
    ).rejects.toThrow('Cần chọn ít nhất 2 SKKN')
  })

  it('throws when SKKN does not belong to teacher', async () => {
    const skkn = makeSKKN({ teacherId: 'other-teacher' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    await expect(
      executeConsume(['skkn-1'], opts, tx as any)
    ).rejects.toThrow('không thuộc giáo viên này')
  })

  it('throws when SKKN is already USED', async () => {
    const skkn = makeSKKN({ status: 'USED', usedFor: 'Bằng khen', usedYear: '2022-2023' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    await expect(
      executeConsume(['skkn-1'], opts, tx as any)
    ).rejects.toThrow('đã được dùng')
  })

  it('throws when SKKN year violates WITHIN_N_YEARS constraint', async () => {
    const skkn = makeSKKN({ academicYear: '2020-2021' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    const condition: SKKNCondition = {
      ...baseCondition,
      yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
    }
    await expect(
      executeConsume(['skkn-1'], { ...opts, condition }, tx as any)
    ).rejects.toThrow('không thỏa điều kiện năm')
  })

  it('throws when SKKN year violates CURRENT_YEAR constraint', async () => {
    const skkn = makeSKKN({ academicYear: '2023-2024' })
    const tx = makeMockTx({ 'skkn-1': skkn })

    const condition: SKKNCondition = {
      ...baseCondition,
      yearConstraint: { type: 'CURRENT_YEAR' },
    }
    await expect(
      executeConsume(['skkn-1'], { ...opts, condition }, tx as any)
    ).rejects.toThrow('không thỏa điều kiện năm')
  })

  it('does not consume when consumeAfterEval is false', async () => {
    const skkn = makeSKKN()
    const tx = makeMockTx({ 'skkn-1': skkn })

    const condition: SKKNCondition = { ...baseCondition, consumeAfterEval: false }
    await executeConsume(['skkn-1'], { ...opts, condition }, tx as any)

    expect(tx.sKKN.update).not.toHaveBeenCalled()
  })

  it('throws when duplicate SKKN IDs are passed', async () => {
    const skkn = makeSKKN()
    const tx = makeMockTx({ 'skkn-1': skkn })

    await expect(
      executeConsume(['skkn-1', 'skkn-1'], opts, tx as any)
    ).rejects.toThrow('cùng một SKKN nhiều lần')
  })

  it('consumes multiple SKKNs when minCount is 2', async () => {
    const skkn1 = makeSKKN({ id: 'skkn-1' })
    const skkn2 = makeSKKN({ id: 'skkn-2' })
    const tx = makeMockTx({ 'skkn-1': skkn1, 'skkn-2': skkn2 })

    const condition: SKKNCondition = { ...baseCondition, minCount: 2 }
    await executeConsume(['skkn-1', 'skkn-2'], { ...opts, condition }, tx as any)

    expect(tx.sKKN.update).toHaveBeenCalledTimes(2)
  })
})
