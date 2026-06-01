/**
 * prisma/seed.ts — Seed data ban đầu (Trường Tiểu học)
 * Chạy: npm run db:seed
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
  await prisma.danhHieu.deleteMany({})
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
  // 2. Ban Giám Hiệu (quyền Admin)
  // ---------------------------------------------------------------------------
  const bghPassword = await hash('BGH@123', 12)
  const bgh = await prisma.user.upsert({
    where: { email: 'bgh@tieuhoc.edu.vn' },
    update: {},
    create: {
      email: 'bgh@tieuhoc.edu.vn',
      passwordHash: bghPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`  ✓ BGH: ${bgh.email}`)

  // ---------------------------------------------------------------------------
  // 3. Giáo viên 1
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
  // 3. Giáo viên 2
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
  // 4. SKKN mẫu cho GV1 (đề tài tiểu học)
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
  // 5. Danh mục danh hiệu (DanhHieu)
  //    Thay thế enum CompetitionTitleType — Admin có thể CRUD từ /admin/danh-hieu
  // ---------------------------------------------------------------------------
  // Chỉ seed "Chiến sĩ thi đua cơ sở" vì EligibilityRule cần liên kết với nó.
  // Các danh hiệu khác (GV Giỏi, GV CN Giỏi...) do Admin/BGH tự tạo trong /admin/danh-hieu.
  const cstdEntry = await prisma.danhHieu.create({
    data: { name: 'Chiến sĩ thi đua cơ sở', description: 'Danh hiệu thi đua cơ sở hàng năm', order: 0, isActive: true },
  })
  const createdDanhHieus = [{ id: cstdEntry.id, name: cstdEntry.name }]
  console.log(`  ✓ 1 danh hiệu mẫu (Chiến sĩ thi đua cơ sở)`)

  const cstdDanhHieu = createdDanhHieus.find(d => d.name === 'Chiến sĩ thi đua cơ sở')!

  // ---------------------------------------------------------------------------
  // 6. EligibilityRule — "Chiến sĩ thi đua cơ sở"
  //    Conditions: anyOf format (OR giữa các nhóm, AND trong mỗi nhóm)
  //    Cách 1: HTXS
  //    Cách 2: HTTốt + 1 SKKN cấp trường trở lên chưa dùng trong 2 năm gần nhất
  // ---------------------------------------------------------------------------
  const ruleCSTD = await prisma.eligibilityRule.create({
    data: {
      id: 'rule-cstd-co-so',
      danhHieuId: cstdDanhHieu.id,
      targetTitle: 'Chiến sĩ thi đua cơ sở',
      isActive: true,
      conditions: {
        anyOf: [
          {
            label: 'Cách 1 — Hoàn thành xuất sắc',
            conditions: [
              {
                type: 'TASK_RESULT',
                minCount: 1,
                statusRequired: 'ANY',
                taskResults: ['EXCELLENT'],
                yearConstraint: { type: 'CURRENT_YEAR' },
                consumeAfterEval: false,
                legalNote: 'Hoàn thành xuất sắc nhiệm vụ trong năm xét. Nghị định 91/2017/NĐ-CP Điều 25',
              },
            ],
          },
          {
            label: 'Cách 2 — HTTốt + SKKN',
            conditions: [
              {
                type: 'TASK_RESULT',
                minCount: 1,
                statusRequired: 'ANY',
                taskResults: ['GOOD', 'EXCELLENT'],
                yearConstraint: { type: 'CURRENT_YEAR' },
                consumeAfterEval: false,
                legalNote: 'Hoàn thành tốt nhiệm vụ trong năm xét',
              },
              {
                type: 'SKKN',
                minCount: 1,
                statusRequired: 'UNUSED',
                minLevel: 'SCHOOL',
                yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
                consumeAfterEval: true,
                legalNote: 'Có 1 SKKN cấp trường trở lên chưa sử dụng trong 2 năm học gần nhất. Nghị định 91/2017/NĐ-CP Điều 25',
              },
            ],
          },
        ],
      },
    },
  })
  console.log(`  ✓ EligibilityRule: ${ruleCSTD.targetTitle} (2 cách)`)

  // ---------------------------------------------------------------------------
  // 7. EligibilityRule — "Bằng khen UBND Thành phố"
  //    Conditions: 2 SKKN cấp trường trở lên chưa dùng + đạt CSTĐCS 2 năm
  // ---------------------------------------------------------------------------
  const ruleBangKhen = await prisma.eligibilityRule.create({
    data: {
      id: 'rule-bang-khen-ubnd-tp',
      danhHieuId: null,
      targetTitle: 'Bằng khen UBND Thành phố',
      isActive: true,
      conditions: {
        anyOf: [
          {
            label: 'Điều kiện đầy đủ',
            conditions: [
              {
                type: 'SKKN',
                minCount: 2,
                statusRequired: 'UNUSED',
                minLevel: 'SCHOOL',
                yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
                consumeAfterEval: true,
                legalNote: 'Phải có 2 SKKN cấp trường trở lên chưa sử dụng trong 2 năm. Nghị định 91/2017/NĐ-CP Điều 72',
              },
              {
                type: 'COMPETITION_TITLE',
                minCount: 2,
                statusRequired: 'ANY',
                yearConstraint: { type: 'WITHIN_N_YEARS', n: 2 },
                consumeAfterEval: false,
                legalNote: 'Đạt CSTĐCS hoặc GV Giỏi ít nhất 2 năm trong 2 năm liền kề',
              },
            ],
          },
        ],
      },
    },
  })
  console.log(`  ✓ EligibilityRule: ${ruleBangKhen.targetTitle}`)

  // ---------------------------------------------------------------------------
  // 8. Tổ chuyên môn tiểu học
  // ---------------------------------------------------------------------------
  const defaultDepartments = [
    'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Tổ 5',
    'Tổ Anh văn', 'Tổ Tin học', 'Tổ Âm nhạc - Mỹ thuật', 'Tổ Thể dục', 'Tổ Văn phòng',
  ]
  for (let i = 0; i < defaultDepartments.length; i++) {
    await prisma.department.create({ data: { name: defaultDepartments[i], order: i } })
  }
  console.log(`  ✓ ${defaultDepartments.length} tổ chuyên môn tiểu học`)

  console.log('\n✅ Seed hoàn tất!')
  console.log('\nTài khoản mặc định:')
  console.log('  Admin:  admin@tieuhoc.edu.vn  /  Admin@123')
  console.log('  BGH:    bgh@tieuhoc.edu.vn    /  BGH@123')
  console.log('  GV1:    gv1@tieuhoc.edu.vn    /  Teacher@123  (Nguyễn Thị Hoa — Tổ 3)')
  console.log('  GV2:    gv2@tieuhoc.edu.vn    /  Teacher@123  (Trần Thị Mai — Tổ 1)')
  console.log('\nDanh mục danh hiệu:')
  for (const dh of createdDanhHieus) {
    console.log(`  - ${dh.name}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
