import { Page, expect } from '@playwright/test'

export class TeacherAchievementsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/teacher/achievements')
  }

  async selectYear(year: string) {
    await this.page.getByTestId('year-selector').selectOption(year)
  }

  // ── Yearly record ──────────────────────────────────────────────────────────

  async saveRecord(taskResult: 'GOOD' | 'EXCELLENT' = 'GOOD') {
    await this.page.getByTestId('select-taskResult').selectOption(taskResult)
    await this.page.getByTestId('btn-save-record').click()
    await this.expectSuccess()
  }

  // ── SKKN ──────────────────────────────────────────────────────────────────

  async addSKKN(title: string, level: 'SCHOOL' | 'DISTRICT' | 'CITY' = 'SCHOOL', rating = 'Tốt') {
    await this.page.getByTestId('input-skkn-title').fill(title)
    await this.page.getByTestId('select-skkn-level').selectOption(level)
    await this.page.getByTestId('input-skkn-rating').fill(rating)
    await this.page.getByTestId('btn-add-skkn').click()
    await this.expectSuccess()
  }

  async expectSKKNStatus(title: string, status: 'Chưa dùng' | 'Đã dùng') {
    const text = await this.page.locator('text=' + title).first().locator('..').locator('..').textContent()
    expect(text).toContain(status)
  }

  // ── Competition title (CSTĐ Cách 2) ──────────────────────────────────────

  async openSKKNConsumeModal() {
    await this.page.getByTestId('select-titleType').selectOption('CHIEN_SI_THI_DUA')
    // Chọn Cách 2 — select phụ hiển thị khi CHIEN_SI_THI_DUA
    const methodSelect = this.page.locator('[data-testid="select-titleType"]').locator('..').locator('..').locator('select').nth(1)
    // Dùng fallback: tìm theo role
    await this.page.locator('select').filter({ hasText: 'Cách 2 (có SKKN)' }).selectOption('METHOD_2')
    await this.page.getByTestId('btn-add-title').click()
    await expect(this.page.getByTestId('skkn-modal')).toBeVisible()
  }

  async selectSKKNInModal(skknId: string) {
    await this.page.getByTestId(`modal-skkn-${skknId}`).check()
  }

  async selectFirstAvailableSKKN(): Promise<string> {
    const checkbox = this.page.locator('[data-testid^="modal-skkn-"]').first()
    const id = (await checkbox.getAttribute('data-testid'))!.replace('modal-skkn-', '')
    await checkbox.check()
    return id
  }

  async confirmSKKNConsume() {
    await this.page.getByTestId('btn-confirm-consume').click()
    await expect(this.page.getByTestId('skkn-modal')).not.toBeVisible({ timeout: 10000 })
    await this.expectSuccess()
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async expectSuccess() {
    await expect(this.page.getByTestId('notification-success')).toBeVisible({ timeout: 10000 })
  }

  async expectError() {
    await expect(this.page.getByTestId('notification-error')).toBeVisible({ timeout: 10000 })
  }
}
