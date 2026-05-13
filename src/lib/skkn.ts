import { Prisma } from '@prisma/client'
import type { SKKN } from '@prisma/client'
import { db } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export type YearConstraint =
  | { type: 'CURRENT_YEAR' }
  | { type: 'WITHIN_N_YEARS'; n: number }
  | { type: 'ANY' }

export type SKKNCondition = {
  type: 'SKKN'
  minCount: number
  statusRequired: 'UNUSED' | 'ANY'
  yearConstraint: YearConstraint
  consumeAfterEval: boolean
  legalNote?: string
}

export type PrismaTransaction = Prisma.TransactionClient

// ── Year helpers ──────────────────────────────────────────────────────────────

export function parseAcademicYear(s: string): { startYear: number; endYear: number } {
  const match = /^(\d{4})-(\d{4})$/.exec(s)
  if (!match) throw new Error(`Định dạng năm học không hợp lệ: "${s}"`)
  const startYear = parseInt(match[1], 10)
  const endYear = parseInt(match[2], 10)
  if (endYear !== startYear + 1)
    throw new Error(`Năm học phải là hai năm liên tiếp: "${s}"`)
  return { startYear, endYear }
}

export function prevAcademicYear(s: string): string {
  const { startYear } = parseAcademicYear(s)
  return `${startYear - 1}-${startYear}`
}

// Returns n years starting from referenceYear going backwards.
// e.g. generateYearRange("2024-2025", 2) → ["2024-2025", "2023-2024"]
export function generateYearRange(referenceYear: string, n: number): string[] {
  const years: string[] = []
  let current = referenceYear
  for (let i = 0; i < n; i++) {
    years.push(current)
    current = prevAcademicYear(current)
  }
  return years
}

// ── Internal ──────────────────────────────────────────────────────────────────

function isYearInConstraint(
  academicYear: string,
  yearConstraint: YearConstraint,
  referenceYear: string
): boolean {
  if (yearConstraint.type === 'ANY') return true
  if (yearConstraint.type === 'CURRENT_YEAR') return academicYear === referenceYear
  const validYears = new Set(generateYearRange(referenceYear, yearConstraint.n))
  return validYears.has(academicYear)
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Returns all SKKN of a teacher that satisfy the condition's status and year
 * constraints. Used to populate the selection list before consuming.
 */
export async function getEligibleSKKNToConsume(
  teacherId: string,
  condition: SKKNCondition,
  referenceYear: string
): Promise<SKKN[]> {
  const skkns = await db.sKKN.findMany({
    where: {
      teacherId,
      ...(condition.statusRequired === 'UNUSED' ? { status: 'UNUSED' } : {}),
    },
  })

  return skkns.filter(skkn =>
    isYearInConstraint(skkn.academicYear, condition.yearConstraint, referenceYear)
  )
}

/**
 * Marks a single SKKN as consumed within a transaction.
 * Re-verifies status to guard against race conditions.
 */
export async function consumeSKKN(
  skknId: string,
  usedFor: string,
  usedYear: string,
  tx: PrismaTransaction
): Promise<void> {
  const skkn = await tx.sKKN.findUniqueOrThrow({ where: { id: skknId } })
  if (skkn.status === 'USED') {
    throw new Error(
      `SKKN "${skkn.title}" đã được dùng để xét "${skkn.usedFor}" năm học ${skkn.usedYear}`
    )
  }
  await tx.sKKN.update({
    where: { id: skknId },
    data: { status: 'USED', usedFor, usedYear },
  })
}

/**
 * Validates a set of SKKN IDs against a condition, then consumes them if
 * condition.consumeAfterEval is true. Must be called inside a Prisma transaction.
 */
export async function executeConsume(
  skknIds: string[],
  opts: {
    teacherId: string
    usedFor: string
    usedYear: string
    condition: SKKNCondition
    referenceYear: string
  },
  tx: PrismaTransaction
): Promise<void> {
  const uniqueIds = Array.from(new Set(skknIds))
  if (uniqueIds.length !== skknIds.length) {
    throw new Error('Không được chọn cùng một SKKN nhiều lần')
  }

  if (skknIds.length < opts.condition.minCount) {
    throw new Error(
      `Cần chọn ít nhất ${opts.condition.minCount} SKKN, nhưng chỉ chọn ${skknIds.length}`
    )
  }

  // Validate all SKKNs before consuming any
  for (const id of skknIds) {
    const skkn = await tx.sKKN.findUniqueOrThrow({ where: { id } })

    if (skkn.teacherId !== opts.teacherId) {
      throw new Error(`SKKN "${skkn.title}" không thuộc giáo viên này`)
    }

    if (skkn.status === 'USED') {
      throw new Error(
        `SKKN "${skkn.title}" đã được dùng để xét "${skkn.usedFor}" năm học ${skkn.usedYear}`
      )
    }

    if (!isYearInConstraint(skkn.academicYear, opts.condition.yearConstraint, opts.referenceYear)) {
      throw new Error(
        `SKKN "${skkn.title}" (năm học ${skkn.academicYear}) không thỏa điều kiện năm của quy tắc`
      )
    }
  }

  if (!opts.condition.consumeAfterEval) return

  for (const id of skknIds) {
    await consumeSKKN(id, opts.usedFor, opts.usedYear, tx)
  }
}
