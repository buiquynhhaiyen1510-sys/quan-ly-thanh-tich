import { z } from 'zod'

const yearConstraintSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CURRENT_YEAR') }),
  z.object({ type: z.literal('WITHIN_N_YEARS'), n: z.number().int().min(1) }),
  z.object({ type: z.literal('ANY') }),
])

export const conditionSchema = z.object({
  type: z.enum(['SKKN', 'COMPETITION_TITLE', 'AWARD', 'TASK_RESULT']),
  minCount: z.number().int().min(0),
  statusRequired: z.enum(['UNUSED', 'ANY']),
  yearConstraint: yearConstraintSchema,
  consumeAfterEval: z.boolean(),
  legalNote: z.string().optional(),
  // TASK_RESULT: filter by specific results (empty = any result counts)
  taskResults: z.array(z.enum(['GOOD', 'EXCELLENT'])).optional(),
  // SKKN: minimum level required
  minLevel: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).optional(),
  // COMPETITION_TITLE: filter by title type and/or level
  titleType: z.enum(['CHIEN_SI_THI_DUA', 'GV_GIOI', 'GV_CN_GIOI']).optional(),
  titleLevel: z.enum(['SCHOOL', 'DISTRICT', 'CITY']).optional(),
  // AWARD: filter by award type
  awardType: z.enum(['CERTIFICATE', 'COMMENDATION', 'CERTIFICATE_OF_MERIT']).optional(),
})

export const conditionGroupSchema = z.object({
  label: z.string().optional(), // "Cách 1", "Cách 2"
  conditions: z.array(conditionSchema).min(1, 'Mỗi nhóm cần ít nhất 1 điều kiện'),
})

// New format: anyOf = OR between groups, AND within each group
export const eligibilityConditionsSchema = z.object({
  anyOf: z.array(conditionGroupSchema).min(1, 'Cần ít nhất 1 nhóm điều kiện'),
})

// Accept either new format or legacy flat array (will be normalized by engine)
const conditionsInputSchema = z.union([
  eligibilityConditionsSchema,
  z.array(conditionSchema).min(1), // legacy: flat array = single AND group
])

export const createRuleSchema = z.object({
  targetTitle: z.string().min(2, 'Tên danh hiệu quá ngắn'),
  danhHieuId: z.string().optional(),
  conditions: conditionsInputSchema,
  isActive: z.boolean().default(true),
})

export const updateRuleSchema = z.object({
  targetTitle: z.string().min(2).optional(),
  danhHieuId: z.string().nullable().optional(),
  conditions: conditionsInputSchema.optional(),
  isActive: z.boolean().optional(),
})

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
export type ConditionInput = z.infer<typeof conditionSchema>
export type ConditionGroup = z.infer<typeof conditionGroupSchema>
export type EligibilityConditions = z.infer<typeof eligibilityConditionsSchema>
