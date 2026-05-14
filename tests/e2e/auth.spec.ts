import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

const ADMIN = { email: 'admin@school.edu.vn', password: 'Admin@123' }
const TEACHER = { email: 'gv1@school.edu.vn', password: 'Teacher@123' }

test.describe('Authentication', () => {
  test('Admin đăng nhập thành công → redirect vào /admin', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(ADMIN.email, ADMIN.password)
    await loginPage.expectRedirectTo('/admin')
  })

  test('GV đăng nhập thành công → redirect vào /teacher', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEACHER.email, TEACHER.password)
    await loginPage.expectRedirectTo('/teacher')
  })

  test('Sai mật khẩu → hiển thị lỗi, không redirect', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(ADMIN.email, 'wrongpassword')
    await loginPage.expectError()
    await expect(page).toHaveURL(/\/login/)
  })

  test('GV không thể truy cập trang Admin', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEACHER.email, TEACHER.password)
    await loginPage.expectRedirectTo('/teacher')

    await page.goto('/admin')
    // Should be redirected away (login or forbidden)
    await expect(page).not.toHaveURL(/^http:\/\/localhost:3000\/admin$/)
  })

  test('Chưa đăng nhập → truy cập /teacher bị redirect về /login', async ({ page }) => {
    await page.goto('/teacher/achievements')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Chưa đăng nhập → truy cập /admin bị redirect về /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })
})
