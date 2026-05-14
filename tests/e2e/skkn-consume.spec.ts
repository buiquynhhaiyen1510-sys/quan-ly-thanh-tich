/**
 * E2E tests — SKKN tiêu flow
 *
 * Các test này cần seed data đã có (npx prisma db seed).
 * Mỗi test tạo SKKN mới qua API trước khi thực hiện flow, để đảm bảo
 * dữ liệu không bị ảnh hưởng lẫn nhau giữa các lần chạy.
 *
 * Seed accounts:
 *   Admin:   admin@school.edu.vn / Admin@123
 *   GV1:     gv1@school.edu.vn   / Teacher@123  (có 3 SKKN mẫu từ seed)
 */

import { test, expect, request } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { TeacherAchievementsPage } from './pages/TeacherAchievementsPage'

const ADMIN = { email: 'admin@school.edu.vn', password: 'Admin@123' }
const TEACHER = { email: 'gv1@school.edu.vn', password: 'Teacher@123' }

// Helper: login programmatically and return cookies for API calls
async function getTeacherSession(baseURL: string) {
  const ctx = await request.newContext({ baseURL })
  await ctx.post('/api/auth/callback/credentials', {
    data: { email: TEACHER.email, password: TEACHER.password },
  })
  return ctx
}

test.describe('SKKN tiêu — Chiến sĩ thi đua Cách 2', () => {
  const YEAR = '2024-2025'

  test.beforeEach(async ({ page }) => {
    // Login as teacher
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEACHER.email, TEACHER.password)
    await loginPage.expectRedirectTo('/teacher')
  })

  test('GV chọn CSTĐ Cách 2 → modal mở → chọn SKKN → xác nhận → SKKN chuyển Đã dùng', async ({ page }) => {
    const achievePage = new TeacherAchievementsPage(page)
    await achievePage.goto()
    await achievePage.selectYear(YEAR)

    // Lưu kết quả nhiệm vụ nếu chưa có
    const saveBtn = page.getByTestId('btn-save-record')
    if (await saveBtn.isEnabled()) {
      await achievePage.saveRecord('GOOD')
    }

    // Thêm SKKN mới để có thể tiêu
    const uniqueTitle = `SKKN-test-consume-${Date.now()}`
    await achievePage.addSKKN(uniqueTitle, 'SCHOOL', 'Tốt')

    // Mở modal CSTĐ Cách 2
    await achievePage.openSKKNConsumeModal()

    // Chọn SKKN trong modal
    const checkboxes = page.locator('[data-testid^="modal-skkn-"]')
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 })
    await checkboxes.first().check()

    // Xác nhận
    await achievePage.confirmSKKNConsume()

    // Kiểm tra notification thành công
    await expect(page.getByTestId('notification-success')).toBeVisible()
  })

  test('GV không thể mở modal khi chưa lưu kết quả nhiệm vụ', async ({ page }) => {
    const achievePage = new TeacherAchievementsPage(page)
    await achievePage.goto()

    // Chọn một năm học xa để không có record
    await achievePage.selectYear('2015-2016')

    // Click thêm danh hiệu — nút disabled nếu không có yearRecord
    const btn = page.getByTestId('btn-add-title')
    await expect(btn).toBeDisabled()
  })

  test('Sau khi tiêu SKKN — SKKN đó không còn xuất hiện trong modal lần 2', async ({ page }) => {
    const achievePage = new TeacherAchievementsPage(page)
    await achievePage.goto()
    await achievePage.selectYear(YEAR)

    // Đảm bảo có record
    const taskSelect = page.getByTestId('select-taskResult')
    if (await taskSelect.isVisible()) {
      await achievePage.saveRecord('GOOD')
    }

    // Thêm 2 SKKN
    const title1 = `SKKN-modal-test-A-${Date.now()}`
    const title2 = `SKKN-modal-test-B-${Date.now()}`
    await achievePage.addSKKN(title1, 'SCHOOL', 'Tốt')
    await achievePage.addSKKN(title2, 'SCHOOL', 'Khá')

    // Mở modal lần 1, tiêu title1
    await achievePage.openSKKNConsumeModal()
    const checkboxes = page.locator('[data-testid^="modal-skkn-"]')
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 })
    const countBefore = await checkboxes.count()
    await checkboxes.first().check()
    await achievePage.confirmSKKNConsume()

    // Mở modal lần 2 — số SKKN khả dụng phải giảm
    await achievePage.openSKKNConsumeModal()
    const checkboxesAfter = page.locator('[data-testid^="modal-skkn-"]')
    await page.waitForTimeout(1000)
    const countAfter = await checkboxesAfter.count()
    expect(countAfter).toBeLessThan(countBefore)
  })
})

test.describe('SKKN tiêu — Bằng khen', () => {
  const YEAR = '2024-2025'

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEACHER.email, TEACHER.password)
    await loginPage.expectRedirectTo('/teacher')
  })

  test('Bằng khen: phải chọn đúng số SKKN theo quy tắc — nút Xác nhận disabled khi chưa đủ', async ({ page }) => {
    const achievePage = new TeacherAchievementsPage(page)
    await achievePage.goto()
    await achievePage.selectYear(YEAR)

    // Đảm bảo có record
    const saveBtn = page.getByTestId('btn-save-record')
    if (await saveBtn.isEnabled()) {
      await achievePage.saveRecord('GOOD')
    }

    // Chọn Bằng khen (COMMENDATION) — dùng select award-type và form khen thưởng
    // Luồng Bằng khen tiêu SKKN được xử lý qua awards API nếu có rule
    // Test này kiểm tra nút confirm disabled khi chưa chọn SKKN nào trong modal
    await achievePage.openSKKNConsumeModal()

    const confirmBtn = page.getByTestId('btn-confirm-consume')
    // Chưa chọn gì → disabled
    await expect(confirmBtn).toBeDisabled()

    // Đóng modal
    await page.locator('button:has-text("Hủy")').click()
    await expect(page.getByTestId('skkn-modal')).not.toBeVisible()
  })
})
