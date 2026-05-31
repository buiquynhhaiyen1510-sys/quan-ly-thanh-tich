export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-helpers'
import { createTeacherSchema } from '@/lib/validations/teacher'

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await request.json().catch(() => null)
  if (!body?.teachers || !Array.isArray(body.teachers)) {
    return NextResponse.json({ error: 'teachers array required' }, { status: 400 })
  }

  const results: { email: string; success: boolean; error?: string }[] = []

  // Xử lý tuần tự từng người để tránh quá tải Supabase pgBouncer
  for (const t of body.teachers) {
    try {
      const parsed = createTeacherSchema.safeParse(t)
      if (!parsed.success) {
        results.push({ email: t.email ?? '?', success: false, error: 'Dữ liệu không hợp lệ' })
        continue
      }

      const { email, password, role, fullName, dateOfBirth, department, teachingSince, isPartyMember, partyJoinDate } = parsed.data

      // Validate dateOfBirth year
      if (dateOfBirth) {
        const year = new Date(dateOfBirth).getFullYear()
        if (isNaN(year) || year < 1930 || year > new Date().getFullYear()) {
          results.push({ email, success: false, error: 'Ngày sinh không hợp lệ' })
          continue
        }
      }

      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        results.push({ email, success: false, error: 'Email đã tồn tại' })
        continue
      }

      const passwordHash = await hash(password, 12)

      await db.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email,
            passwordHash,
            role: role ?? 'TEACHER',
            isActive: true,
            teacherProfile: {
              create: {
                fullName,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                department,
                teachingSince,
                isPartyMember,
                partyJoinDate: partyJoinDate ? new Date(partyJoinDate) : null,
              },
            },
          },
        })
      })

      results.push({ email, success: true })
    } catch (err) {
      results.push({
        email: t.email ?? '?',
        success: false,
        error: err instanceof Error ? err.message : 'Lỗi không xác định',
      })
    }
  }

  return NextResponse.json({ results })
}
