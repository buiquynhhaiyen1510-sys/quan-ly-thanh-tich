import { z } from 'zod'

export const createTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['TEACHER', 'ADMIN']).default('TEACHER'),
  fullName: z.string().min(2),
  dateOfBirth: z.string(), // ISO date string
  department: z.string().min(1),
  teachingSince: z.number().int().min(1970).max(new Date().getFullYear()),
  isPartyMember: z.boolean(),
  partyJoinDate: z.string().nullable().optional(),
})

export const updateTeacherSchema = z.object({
  fullName: z.string().min(2).optional(),
  dateOfBirth: z.string().nullable().optional(),
  department: z.string().optional(),
  teachingSince: z.number().int().min(1970).max(new Date().getFullYear()).optional(),
  isPartyMember: z.boolean().optional(),
  partyJoinDate: z.string().nullable().optional(),
  role: z.enum(['TEACHER', 'ADMIN']).optional(),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
