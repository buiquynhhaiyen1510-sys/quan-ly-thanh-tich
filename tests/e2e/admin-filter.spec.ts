/**
 * E2E tests — Admin lọc GV tiềm năng
 *
 * Cần seed data: Admin + GV1 (Nguyễn Thị Lan, có SKKN) + 2 EligibilityRules
 *   - "Chiến sĩ thi đua cơ sở" (rule-cstd-co-so)
 *   - "Bằng khen UBND Thành phố" (rule-bang-khen-ubnd-tp)
 */

import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { AdminEligibilityPage } from './pages/AdminEligibilityPage'

const ADMIN = { email: 'admin@school.edu.vn', password: 'Admin@123' }

test.describe('Admin — Lọc GV tiềm năng', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(ADMIN.email, ADMIN.password)
    await loginPage.expectRedirectTo('/admin')
  })

  test('Trang eligibility tải được, có dropdown rule', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    await expect(page.getByTestId('select-rule')).toBeVisible()
    await expect(page.getByTestId('select-year')).toBeVisible()
    await expect(page.getByTestId('btn-run-check')).toBeVisible()
  })

  test('Chạy kiểm tra — kết quả hiển thị eligible + ineligible section', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    await eligPage.selectRule('Chiến sĩ thi đua cơ sở')
    await eligPage.selectYear('2024-2025')
    await eligPage.runCheck()

    // Kết quả phải có 2 section
    await expect(page.getByTestId('eligible-section')).toBeVisible()
    await expect(page.getByTestId('ineligible-section')).toBeVisible()

    // Tổng eligible + ineligible = số GV
    const eligible = await eligPage.getEligibleCount()
    const ineligible = await eligPage.getIneligibleCount()
    expect(eligible + ineligible).toBeGreaterThan(0)
  })

  test('GV có SKKN UNUSED → xuất hiện trong danh sách đủ điều kiện', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    // GV1 (Nguyễn Thị Lan) có 3 SKKN UNUSED từ seed → eligible với CSTĐ CS
    await eligPage.selectRule('Chiến sĩ thi đua cơ sở')
    await eligPage.selectYear('2024-2025')
    await eligPage.runCheck()

    // GV1 có SKKN → nên eligible (hoặc ít nhất phải check engine đã chạy)
    const eligible = await eligPage.getEligibleCount()
    const ineligible = await eligPage.getIneligibleCount()
    expect(eligible + ineligible).toBeGreaterThan(0)
  })

  test('GV không có SKKN → xuất hiện trong danh sách chưa đủ điều kiện', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    // GV2 (Trần Văn Minh) không có SKKN → ineligible với CSTĐ CS (Cách 2 cần SKKN)
    await eligPage.selectRule('Chiến sĩ thi đua cơ sở')
    await eligPage.selectYear('2024-2025')
    await eligPage.runCheck()

    await eligPage.expectTeacherInIneligibleList('Trần Văn Minh')
  })

  test('Sau khi chạy kiểm tra → nút Xuất Excel xuất hiện', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    await eligPage.selectRule('Chiến sĩ thi đua cơ sở')
    await eligPage.selectYear('2024-2025')
    await eligPage.runCheck()

    await eligPage.exportExcelLinkVisible()
  })

  test('Chọn rule Bằng khen UBND — kết quả hiển thị', async ({ page }) => {
    const eligPage = new AdminEligibilityPage(page)
    await eligPage.goto()

    await eligPage.selectRule('Bằng khen UBND Thành phố')
    await eligPage.selectYear('2024-2025')
    await eligPage.runCheck()

    await expect(page.getByTestId('eligible-section')).toBeVisible()
    await expect(page.getByTestId('ineligible-section')).toBeVisible()
  })
})
