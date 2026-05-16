/**
 * prisma/seed.ts — Seed data ban đầu (Trường Tiểu học)
 *
 * Chạy: npm run db:seed
 *
 * Seed bao gồm:
 *   - 1 Admin user (Hiệu trưởng / cán bộ phụ trách thi đua)
 *   - 2 Teacher users + TeacherProfile (GV tiểu học)
 *   - 2 EligibilityRule mẫu
 *   - Vài SKKN mẫu cho GV1 (đề tài tiểu học)
 *   - Tổ chuyên môn tiểu học
 */

import { PrismaClient, SKKNLevel, SKKNStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Xóa dữ liệu cũ...')
  await prisma.awardSKKN.deleteMany({})
  await prisma.competitionTitle.deleteMany({})
  await prisma.award.deleteMany({})
  await prisma.sKKN.deleteMany({})
  await prisma.yearlyRecord.deleteMany({})
  await prisma.teacherProfile.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.eligibilityRule.deleteMany({})
  await prisma.department.deleteMany({})
  console.log('  ✓ Đã xóa sạch dữ liệu cũ')

  console.log('🌱 Bắt đầu seed data...')

  // ---------------------------------------------------------------------------
  // 1. Admin user
  // ---------------------------------------------------------------------------
  const adminPassword = await hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tieuhoc.edu.vn' },
    update: {},
    create: {
      email: 'admin@tieuhoc.edu.vn',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`  ✓ Admin: ${admin.email}`)

  // ---------------------------------------------------------------------------
  // 2. Giáo viên 1 — GV chủ nhiệm khối 3, có SKKN
  // ---------------------------------------------------------------------------
  const teacherPassword = await hash('Teacher@123', 12)

  const teacher1User = await prisma.user.upsert({
    where: { email: 'gv1@tieuhoc.edu.vn' },
    update: {},
    create: {
      email: 'gv1@tieuhoc.edu.vn',
      passwordHash: teacherPassword,
      role: 'TEACHER',
      isActive: true,
    },
  })

  const teacher1Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacher1User.id },
    update: {},
    create: {
      userId: teacher1User.id,
      fullName: 'Nguyễn Thị Hoa',
      dateOfBirth: new Date('1988-04-20'),
      department: 'Tổ 3',
      teachingSince: 2010,
      isPartyMember: true,
      partyJoinDate: new Date('2015-02-03'),
    },
  })
  console.log(`  ✓ GV1: ${teacher1User.email} (${teacher1Profile.fullName})`)

  // ---------------------------------------------------------------------------
  // 3. Giáo viên 2 — GV khối 1, chưa có SKKN
  // ---------------------------------------------------------------------------
  const teacher2User = await prisma.user.upsert({
    where: { email: 'gv2@tieuhoc.edu.vn' },
    update: {},
    create: {
      email: 'gv2@tieuhoc.edu.vn',
      passwordHash: teacherPassword,
      role: 'TEACHER',
      isActive: true,
    },
  })

  const teacher2Profile = await prisma.teacherProfile.upsert({
    where: { userId: teacher2User.id },
    update: {},
    create: {
      userId: teacher2User.id,
      fullName: 'Trần Thị Mai',
      dateOfBirth: new Date('1995-09-12'),
      department: 'Tổ 1',
      teachingSince: 2018,
      isPartyMember: false,
      partyJoinDate: null,
    },
  })
  console.log(`  ✓ GV2: ${teacher2User.email} (${teacher2Profile.fullName})`)

  // ---------------------------------------------------------------------------
  // 4. SKKN mẫu cho GV1 (đề tài phù hợp tiểu học)
  // ---------------------------------------------------------------------------
  const skkn1 = await prisma.sKKN.create({
    data: {
      teacherId: teacher1Profile.id,
      title: 'Một số biện pháp rèn kỹ năng đọc hiểu cho học sinh lớp 3',
      level: SKKNLevel.SCHOOL,
      rating: 'Tốt',
      academicYear: '2022-2023',
      status: SKKNStatus.UNUSED,
    },
  })

  const skkn2 = await prisma.sKKN.create({
    data: {
      teacherId: teacher1Profile.id,
      title: 'Ứng dụng trò chơi học tập trong dạy Toán lớp 3',
      level: SKKNLevel.DISTRICT,
      rating: 'Xuất sắc',
      academicYear: '2023-2024',
      status: SKKNStatus.UNUSED,
    },
  })

  const skkn3 = await prisma.sKKN.create({
    data: {
      teacherId: teacher1Profile.id,
      title: 'Phương pháp giúp học sinh lớp 3 học tốt bảng nhân qua trò chơi',
      level: SKKNLevel.SCHOOL,
      rating: 'Khá',
      academicYear: '2024-2025',
      status: SKKNStatus.UNUSED,
    },
  })

  console.log(`  ✓ SKKN GV1: ${skkn1.title}`)
  console.log(`  ✓ SKKN GV1: ${skkn2.title}`)
  console.log(`  ✓ SKKN GV1: ${skkn3.title}`)

  // ---------------------------------------------------------------------------
  // 5. EligibilityRule — "Chiến sĩ thi đua cơ sở"
  //    Điều kiện: HTTốt hoặc HTXS + 1 SKKN chưa dùng trong 2 năm gần nhất
  //    Căn cứ: Nghị định 91/2017/NĐ-CP Điều 25
  // ---------------------------------------------------------------------------
  const ruleCSTD = await prisma.eligibilityRule.upsert({
    where: { id: 'rule-cstd-co-so' },
    update: {},
    create: {
      id: 'rule-cstd-co-so',
      targetTitle: 'Chiến sĩ thi đua cơ sở',
      isActive: true,
      conditions: [
        {
          type: 'TASK_RESULT',
          minCount: 1,
          statusRequired: 'ANY',
          yearConstraint: { type: 'CURRENT_YEAR' },
          consumeAfterEval: false,
          legalNote: 'Hoàn thành tốt nhiệm vụ (HTTốt hoặc HTXS) trong năm xét',
        },
        {
          type: 'SKKN',
          minCount: 1,
          statusRequired: 'UNUSED',
          yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
          consumeAfterEval: true,
          legalNote:
            'Cách 2: Có 1 SKKN cấp trường trở lên chưa sử dụng trong 2 năm học gần nhất. Căn cứ: Nghị định 91/2017/NĐ-CP Điều 25',
        },
      ],
    },
  })
  console.log(`  ✓ EligibilityRule: ${ruleCSTD.targetTitle}`)

  // ---------------------------------------------------------------------------
  // 6. EligibilityRule — "Bằng khen UBND Thành phố"
  //    Điều kiện: 2 SKKN chưa dùng trong 2 năm + đạt CSTĐCS hoặc GV Giỏi 2 năm liền
  //    Căn cứ: Nghị định 91/2017/NĐ-CP Điều 72, Thông tư 12/2019/TT-BNV
  // ---------------------------------------------------------------------------
  const ruleBangKhen = await prisma.eligibilityRule.upsert({
    where: { id: 'rule-bang-khen-ubnd-tp' },
    update: {},
    create: {
      id: 'rule-bang-khen-ubnd-tp',
      targetTitle: 'Bằng khen UBND Thành phố',
      isActive: true,
      conditions: [
        {
          type: 'SKKN',
          minCount: 2,
          statusRequired: 'UNUSED',
          yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
          consumeAfterEval: true,
          legalNote:
            'Phải có 2 SKKN cấp trường trở lên chưa sử dụng trong 2 năm học liền kề. Căn cứ: Nghị định 91/2017/NĐ-CP Điều 72, Thông tư 12/2019/TT-BNV',
        },
        {
          type: 'COMPETITION_TITLE',
          minCount: 2,
          statusRequired: 'ANY',
          yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
          consumeAfterEval: false,
          legalNote:
            'Đạt danh hiệu Chiến sĩ thi đua cơ sở hoặc GV Giỏi ít nhất 2 năm trong 2 năm liền kề',
        },
      ],
    },
  })
  console.log(`  ✓ EligibilityRule: ${ruleBangKhen.targetTitle}`)

  // ---------------------------------------------------------------------------
  // 7. Tổ chuyên môn tiểu học
  //    Tiểu học thường tổ chức theo khối lớp hoặc theo môn chuyên biệt
  // ---------------------------------------------------------------------------
  const defaultDepartments = [
    'Tổ 1',          // Khối lớp 1
    'Tổ 2',          // Khối lớp 2
    'Tổ 3',          // Khối lớp 3
    'Tổ 4',          // Khối lớp 4
    'Tổ 5',          // Khối lớp 5
    'Tổ Anh văn',    // Giáo viên Tiếng Anh toàn trường
    'Tổ Tin học',    // Giáo viên Tin học
    'Tổ Âm nhạc - Mỹ thuật',  // Môn nghệ thuật
    'Tổ Thể dục',    // Giáo viên Thể dục
    'Tổ Văn phòng',  // Hành chính, kế toán
  ]
  for (let i = 0; i < defaultDepartments.length; i++) {
    await prisma.department.upsert({
      where: { name: defaultDepartments[i] },
      update: {},
      create: { name: defaultDepartments[i], order: i },
    })
  }
  console.log(`  ✓ ${defaultDepartments.length} tổ chuyên môn tiểu học`)

  console.log('\n✅ Seed hoàn tất!')
  console.log('\nTài khoản mặc định:')
  console.log('  Admin:  admin@tieuhoc.edu.vn  /  Admin@123')
  console.log('  GV1:    gv1@tieuhoc.edu.vn    /  Teacher@123  (Nguyễn Thị Hoa — Tổ 3)')
  console.log('  GV2:    gv2@tieuhoc.edu.vn    /  Teacher@123  (Trần Thị Mai — Tổ 1)')
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
