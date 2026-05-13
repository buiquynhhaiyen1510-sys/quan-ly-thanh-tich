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
})

export const conditionsSchema = z.array(conditionSchema).min(1, 'Cần ít nhất 1 điều kiện')

export const createRuleSchema = z.object({
  targetTitle: z.string().min(2, 'Tên danh hiệu quá ngắn'),
  conditions: conditionsSchema,
  isActive: z.boolean().default(true),
})

export const updateRuleSchema = z.object({
  targetTitle: z.string().min(2).optional(),
  conditions: conditionsSchema.optional(),
  isActive: z.boolean().optional(),
})

export type CreateRuleInput = z.infer<typeof createRuleSchema>
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>
export type ConditionInput = z.infer<typeof conditionSchema>
