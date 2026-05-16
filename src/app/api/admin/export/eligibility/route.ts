export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { runEligibilityCheck } from '@/lib/eligibility'
import { buildWorkbook, excelResponse } from '@/lib/excel'
import { parseAcademicYear } from '@/lib/skkn'

const CONDITION_TYPE_LABELS: Record<string, string> = {
  SKKN: 'SKKN',
  COMPETITION_TITLE: 'Danh hiệu thi đua',
  AWARD: 'Khen thưởng',
  TASK_RESULT: 'Kết quả nhiệm vụ',
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const ruleId = request.nextUrl.searchParams.get('ruleId')
  const year = request.nextUrl.searchParams.get('year')

  if (!ruleId || !year) {
    return NextResponse.json({ error: 'Thiếu tham số ruleId hoặc year' }, { status: 400 })
  }

  try {
    parseAcademicYear(year)
  } catch {
    return NextResponse.json({ error: 'Năm học không hợp lệ (ví dụ: 2024-2025)' }, { status: 400 })
  }

  const result = await runEligibilityCheck(ruleId, year).catch(() => null)
  if (!result) {
    return NextResponse.json({ error: 'Quy tắc không tồn tại hoặc có lỗi xảy ra' }, { status: 404 })
  }

  const eligibleSheet = result.eligible.map(t => {
    const row: Record<string, string | number> = {
      'Họ tên': t.teacherName,
      'Kết quả': 'Đủ điều kiện',
    }
    t.conditions.forEach((c, i) => {
      row[`ĐK${i + 1} (${CONDITION_TYPE_LABELS[c.conditionType] ?? c.conditionType})`] =
        `Đạt (${c.found}/${c.needed})`
    })
    return row
  })

  const ineligibleSheet = result.ineligible.map(t => {
    const row: Record<string, string | number> = {
      'Họ tên': t.teacherName,
      'Kết quả': 'Chưa đủ điều kiện',
    }
    t.conditions.forEach((c, i) => {
      row[`ĐK${i + 1} (${CONDITION_TYPE_LABELS[c.conditionType] ?? c.conditionType})`] =
        c.met ? `Đạt (${c.found}/${c.needed})` : `Chưa đạt (${c.found}/${c.needed} cần)`
    })
    return row
  })

  const wb = buildWorkbook([
    { name: 'Đủ điều kiện', rows: eligibleSheet },
    { name: 'Chưa đủ điều kiện', rows: ineligibleSheet },
  ])

  const safeTitle = result.targetTitle.replace(/[^a-zA-Z0-9àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ ]/gi, '').trim()
  return excelResponse(wb, `loc-gv-${safeTitle}-${year}.xlsx`)
}
