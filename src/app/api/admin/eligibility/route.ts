import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { runEligibilityCheck } from '@/lib/eligibility'
import { parseAcademicYear } from '@/lib/skkn'

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = request.nextUrl
  const ruleId = searchParams.get('ruleId')
  const year = searchParams.get('year')

  if (!ruleId || !year) {
    return NextResponse.json({ error: 'ruleId và year là bắt buộc' }, { status: 400 })
  }

  try {
    parseAcademicYear(year)
  } catch {
    return NextResponse.json(
      { error: 'Định dạng năm học không hợp lệ. Ví dụ: 2024-2025' },
      { status: 422 }
    )
  }

  try {
    const result = await runEligibilityCheck(ruleId, year)
    return NextResponse.json(result)
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Rule không tìm thấy' }, { status: 404 })
    }
    throw err
  }
}
