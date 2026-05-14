import { Page, expect } from '@playwright/test'

export class AdminEligibilityPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/eligibility')
  }

  async selectRule(ruleTitle: string) {
    const select = this.page.getByTestId('select-rule')
    await expect(select).toBeVisible()
    await select.selectOption({ label: ruleTitle })
  }

  async selectYear(year: string) {
    await this.page.getByTestId('select-year').selectOption(year)
  }

  async runCheck() {
    await this.page.getByTestId('btn-run-check').click()
    // Wait for results to appear
    await expect(this.page.getByTestId('eligible-section')).toBeVisible({ timeout: 30000 })
  }

  async getEligibleCount(): Promise<number> {
    const text = await this.page.getByTestId('eligible-count').textContent()
    return parseInt(text?.match(/\d+/)?.[0] ?? '0', 10)
  }

  async getIneligibleCount(): Promise<number> {
    const text = await this.page.getByTestId('ineligible-count').textContent()
    return parseInt(text?.match(/\d+/)?.[0] ?? '0', 10)
  }

  async expectTeacherInEligibleList(teacherName: string) {
    await expect(
      this.page.getByTestId('eligible-list').locator(`text=${teacherName}`)
    ).toBeVisible()
  }

  async expectTeacherInIneligibleList(teacherName: string) {
    await expect(
      this.page.getByTestId('ineligible-list').locator(`text=${teacherName}`)
    ).toBeVisible()
  }

  async exportExcelLinkVisible() {
    await expect(this.page.getByTestId('btn-export-excel')).toBeVisible()
  }
}
