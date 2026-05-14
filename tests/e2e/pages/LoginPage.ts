import { Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
    await expect(this.page.getByTestId('login-form')).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.page.getByTestId('input-email').fill(email)
    await this.page.getByTestId('input-password').fill(password)
    await this.page.getByTestId('btn-login').click()
  }

  async expectError() {
    await expect(this.page.getByTestId('error-message')).toBeVisible()
  }

  async expectRedirectTo(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path.replace('/', '\\/')))
  }
}
