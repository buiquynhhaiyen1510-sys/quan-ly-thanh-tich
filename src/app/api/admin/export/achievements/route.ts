import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { buildWorkbook, excelResponse } from '@/lib/excel'
import { parseAcademicYear } from '@/lib/skkn'

const LEVEL_LABELS: Record<string, string> = {
  SCHOOL: 'Cấp trường',
  DISTRICT: 'Cấp phường',
  CITY: 'Cấp tỉnh/TP',
}
const TASK_LABELS: Record<string, string> = {
  NOT_COMPLETED: 'Chưa hoàn thành',
  GOOD: 'Hoàn thành tốt',
  EXCELLENT: 'Hoàn thành xuất sắc',
}
const PARTY_LABELS: Record<string, string> = {
  GOOD: 'Đảng viên hoàn thành tốt',
  EXCELLENT: 'Đảng viên hoàn thành xuất sắc',
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const year = request.nextUrl.searchParams.get('year')
  if (!year) {
    return NextResponse.json({ error: 'Thiếu tham số year' }, { status: 400 })
  }

  let parsed: { startYear: number; endYear: number }
  try {
    parsed = parseAcademicYear(year)
  } catch {
    return NextResponse.json({ error: 'Năm học không hợp lệ (ví dụ: 2024-2025)' }, { status: 400 })
  }

  const calendarYears = [String(parsed.startYear), String(parsed.endYear)]

  const teachers = await db.teacherProfile.findMany({
    include: {
      user: { select: { isActive: true } },
      yearlyRecords: {
        where: { academicYear: year },
        include: { competitionTitles: { include: { danhHieu: true } } },
      },
      skkns: {
        where: { academicYear: year },
        orderBy: { createdAt: 'asc' },
      },
      awards: {
        where: { year: { in: calendarYears } },
        orderBy: { year: 'asc' },
      },
    },
    orderBy: { fullName: 'asc' },
  })

  // Sheet 1: Kết quả nhiệm vụ
  const taskSheet = teachers.flatMap(t => {
    const rec = t.yearlyRecords[0]
    if (!rec) return []
    return [{
      'Họ tên': t.fullName,
      'Tổ': t.department,
      'Năm học': year,
      'Kết quả nhiệm vụ': TASK_LABELS[rec.taskResult] ?? rec.taskResult,
      'Xếp loại đảng viên': rec.partyRating ? (PARTY_LABELS[rec.partyRating] ?? rec.partyRating) : 'Không phải đảng viên',
    }]
  })

  // Sheet 2: Danh hiệu thi đua
  const titleSheet = teachers.flatMap(t => {
    const rec = t.yearlyRecords[0]
    if (!rec) return []
    return rec.competitionTitles.map(ct => ({
      'Họ tên': t.fullName,
      'Tổ': t.department,
      'Năm học': year,
      'Danh hiệu': ct.danhHieu?.name ?? ct.danhHieuId,
      'Cấp': ct.level ? (LEVEL_LABELS[ct.level] ?? ct.level) : '',
      'Cách đạt': ct.achievementMethod === 'METHOD_1' ? 'Cách 1' : ct.achievementMethod === 'METHOD_2' ? 'Cách 2' : '',
    }))
  })

  // Sheet 3: SKKN
  const skknSheet = teachers.flatMap(t =>
    t.skkns.map(s => ({
      'Họ tên': t.fullName,
      'Tổ': t.department,
      'Năm học': s.academicYear,
      'Tên SKKN': s.title,
      'Cấp': LEVEL_LABELS[s.level] ?? s.level,
      'Xếp loại': s.rating,
      'Trạng thái': s.status === 'UNUSED' ? 'Chưa dùng' : 'Đã dùng',
      'Dùng cho': s.usedFor ?? '',
      'Năm xét': s.usedYear ?? '',
    }))
  )

  // Sheet 4: Khen thưởng
  const AWARD_TYPE_LABELS: Record<string, string> = {
    CERTIFICATE: 'Giấy khen',
    COMMENDATION: 'Bằng khen',
    CERTIFICATE_OF_MERIT: 'Giấy chứng nhận',
  }
  const awardSheet = teachers.flatMap(t =>
    t.awards.map(a => ({
      'Họ tên': t.fullName,
      'Tổ': t.department,
      'Hình thức': AWARD_TYPE_LABELS[a.type] ?? a.type,
      'Cơ quan khen': a.issuingLevel,
      'Nội dung': a.content,
      'Năm': a.year,
      'Số QĐ': a.decisionNumber ?? '',
      'Ngày QĐ': a.decisionDate ? new Date(a.decisionDate).toLocaleDateString('vi-VN') : '',
    }))
  )

  const wb = buildWorkbook([
    { name: 'Kết quả nhiệm vụ', rows: taskSheet },
    { name: 'Danh hiệu thi đua', rows: titleSheet },
    { name: 'SKKN', rows: skknSheet },
    { name: 'Khen thưởng', rows: awardSheet },
  ])

  return excelResponse(wb, `thanh-tich-${year}.xlsx`)
}
