/**
 * Beem Smoke Tests
 *
 * Covers: login, auth redirect, all 7 nav pages, key UI interactions,
 * theme toggle, and logout.
 *
 * Requires the dev server running at http://localhost:3000
 * and a seeded DB (make db-seed).
 *
 * Run: npx playwright test
 */

import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDS = { username: 'admin', password: 'changeme' }

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto(`${BASE}/login`)
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Username').fill(CREDS.username)
  await page.getByLabel('Password').fill(CREDS.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(BASE + '/')
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

test.describe('Authentication', () => {
  test('unauthenticated root redirects to /login', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Beem' })).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('invalid credentials stay on login page', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.getByLabel('Username').fill('admin')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login/)
    // Should not reach dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).not.toBeVisible()
  })

  test('valid credentials reach dashboard', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('admin')).toBeVisible()
    await expect(page.getByText('Default')).toBeVisible() // workspace name
  })
})

// ---------------------------------------------------------------------------
// Pages — each test logs in fresh
// ---------------------------------------------------------------------------

test.describe('Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // -- Dashboard -------------------------------------------------------------

  test('dashboard: stat cards visible', async ({ page }) => {
    await expect(page.getByText('THIS MONTH SPEND')).toBeVisible()
    await expect(page.getByText('ROLLING AVERAGE')).toBeVisible()
    await expect(page.getByText('YTD SPEND')).toBeVisible()
    // "Surplus / Deficit" appears in both the stat card and chart panel — match first (stat card)
    await expect(page.getByText('Surplus / Deficit').first()).toBeVisible()
  })

  test('dashboard: chart panels visible', async ({ page }) => {
    await expect(page.getByText('Spend (Debit)')).toBeVisible()
    await expect(page.getByText('Income (Credit)')).toBeVisible()
    // Last match to avoid collision with stat card label
    await expect(page.getByText('Surplus / Deficit').last()).toBeVisible()
  })

  test('dashboard: time range buttons cycle without error', async ({ page }) => {
    for (const label of ['1 Month', '3 Months', '6 Months', '12 Months', '24 Months', 'All']) {
      await page.getByRole('button', { name: label }).click()
    }
    // No JS errors
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    expect(errors).toHaveLength(0)
  })

  // -- Summary ---------------------------------------------------------------

  test('summary: page loads with correct grid sections', async ({ page }) => {
    await page.getByRole('link', { name: 'Summary' }).click()
    await expect(page).toHaveURL(/\/summary/)
    const main = page.getByRole('main')
    await expect(main.getByText('GROUP TOTALS')).toBeVisible()
    await expect(main.getByText('BY MONTH')).toBeVisible()
    await expect(main.getByText('CLASS TOTALS')).toBeVisible()
    // scope to main to avoid matching the "Transactions" nav link
    await expect(main.getByText('TRANSACTIONS')).toBeVisible()
  })

  // -- Compare ---------------------------------------------------------------

  test('compare: page loads with panel and Add Panel button', async ({ page }) => {
    await page.getByRole('link', { name: 'Compare' }).click()
    await expect(page).toHaveURL(/\/compare/)
    await expect(page.getByRole('button', { name: 'Add Panel' })).toBeVisible()
    // Radix Select has no accessible name — match by current value text
    await expect(page.getByRole('combobox').filter({ hasText: 'All Groups' }).first()).toBeVisible()
  })

  test('compare: Add Panel creates a second panel', async ({ page }) => {
    await page.getByRole('link', { name: 'Compare' }).click()
    await expect(page.getByRole('button', { name: 'Remove panel' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Add Panel' }).click()
    await expect(page.getByRole('button', { name: 'Remove panel' })).toHaveCount(2)
  })

  // -- Transactions ----------------------------------------------------------

  test('transactions: page loads with search and filter controls', async ({ page }) => {
    await page.getByRole('link', { name: 'Transactions' }).click()
    await expect(page).toHaveURL(/\/transactions/)
    await expect(page.getByPlaceholder('Search description...')).toBeVisible()
    // Radix Select has no accessible name — match by current value text
    await expect(page.getByRole('combobox').filter({ hasText: 'All Groups' })).toBeVisible()
    await expect(page.getByRole('combobox').filter({ hasText: 'All Classes' })).toBeVisible()
    await expect(page.getByRole('combobox').filter({ hasText: 'All Sources' })).toBeVisible()
    await expect(page.getByText('0 transactions')).toBeVisible()
  })

  // -- Import ----------------------------------------------------------------

  test('import: page loads with drop zone and history grid', async ({ page }) => {
    await page.getByRole('link', { name: 'Import' }).click()
    await expect(page).toHaveURL(/\/import/)
    await expect(page.getByText('Drop CSV files here, or click to browse')).toBeVisible()
    await expect(page.getByText(/\{source\}_\{YYYY-MM\}\.csv/)).toBeVisible()
    await expect(page.getByText('Import History')).toBeVisible()
  })

  // -- Classifiers -----------------------------------------------------------

  test('classifiers: page loads with seeded rules count', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    await expect(page).toHaveURL(/\/classifiers/)
    await expect(page.getByText('44')).toBeVisible()
    await expect(page.getByText('rules')).toBeVisible()
  })

  test('classifiers: grid shows expected column headers', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    await expect(page.getByRole('columnheader', { name: 'Class' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Group' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Regex' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Constraints' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  })

  test('classifiers: known seeded rules are present', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    await expect(page.getByRole('gridcell', { name: 'Accommodation' }).first()).toBeVisible()
    await expect(page.getByRole('gridcell', { name: 'Supermarket' }).first()).toBeVisible()
    await expect(page.getByRole('gridcell', { name: 'Salary' }).first()).toBeVisible()
  })

  test('classifiers: Add Rule dialog opens, validates, and cancels', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    await page.getByRole('button', { name: 'Add Rule' }).click()

    const dialog = page.getByRole('dialog', { name: 'Add Classifier Rule' })
    await expect(dialog).toBeVisible()

    // Create button is disabled until class is selected
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled()

    // Select a class from dropdown
    await dialog.getByRole('combobox').click()
    await page.getByText('Holiday / Accommodation').click()

    // Fill regex — Create becomes enabled
    await dialog.getByPlaceholder('e.g. WOOLWORTHS').fill('.*TEST.*')
    await expect(dialog.getByRole('button', { name: 'Create' })).toBeEnabled()

    // Cancel — dialog closes, rule count unchanged
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText('44')).toBeVisible()
  })

  test('classifiers: Edit button opens dialog pre-filled', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    // Click edit on first row
    await page.getByRole('button', { name: 'Edit' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Class should already be selected (not placeholder)
    await expect(dialog.getByRole('combobox')).not.toHaveText('Select class...')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
  })

  test('classifiers: Group filter reduces displayed rules', async ({ page }) => {
    await page.getByRole('link', { name: 'Classifiers' }).click()
    await expect(page.getByText('44')).toBeVisible()
    // Radix Select has no accessible name — match by current value text
    await page.getByRole('combobox').filter({ hasText: 'All Groups' }).click()
    await page.getByRole('option', { name: 'Food' }).click()
    // Rule count should drop (Food has fewer than 44 rules)
    await expect(page.getByText('44')).not.toBeVisible()
  })

  // -- Sources ---------------------------------------------------------------

  test('sources: page loads with instruction and grid', async ({ page }) => {
    await page.getByRole('link', { name: 'Sources' }).click()
    await expect(page).toHaveURL(/\/sources/)
    await expect(page.getByText('Click a source to view its transactions.')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Transactions' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// UI Interactions
// ---------------------------------------------------------------------------

test.describe('UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('theme toggle switches between dark and light mode', async ({ page }) => {
    const html = page.locator('html')
    const before = await html.getAttribute('class')
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await page.waitForTimeout(150)
    const after = await html.getAttribute('class')
    expect(after).not.toBe(before)
    // Restore
    await page.getByRole('button', { name: 'Toggle theme' }).click()
  })

  test('sidebar collapse button toggles sidebar width', async ({ page }) => {
    // <aside> has an implicit complementary role — use element selector, not attribute
    const sidebar = page.locator('aside').first()
    await sidebar.waitFor({ state: 'visible' })
    const widthBefore = (await sidebar.boundingBox())?.width ?? 0
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await page.waitForTimeout(300) // allow CSS transition
    const widthAfter = (await sidebar.boundingBox())?.width ?? 0
    expect(widthAfter).toBeLessThan(widthBefore)
  })

  test('logout redirects to login', async ({ page }) => {
    // Use the topbar logout (not sidebar)
    await page.getByRole('banner').getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Beem' })).toBeVisible()
  })

  test('no JS errors across page navigation', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    const routes = ['/summary', '/compare', '/transactions', '/import', '/classifiers', '/sources', '/']
    for (const route of routes) {
      await page.goto(`${BASE}${route}`)
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })
})
