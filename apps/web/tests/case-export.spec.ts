import { test, expect } from '@playwright/test'

const mockJobId = 'job-123'

function mockExportRoutes(page: any, { readyImmediately = false } = {}) {
  let statusCalls = 0

  page.route('**/api/tenants/**/exports', async (route: any) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockJobId,
          status: 'accepted',
          startedAt: new Date().toISOString(),
        }),
      })
    }
    return route.continue()
  })

  page.route(`**/api/tenants/**/exports/${mockJobId}`, async (route: any) => {
    statusCalls += 1
    if (readyImmediately || statusCalls > 1) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockJobId,
          status: 'completed',
          progress: 100,
          downloadUrl: 'http://localhost:3000/exports/mock.pdf',
          updatedAt: new Date().toISOString(),
        }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: mockJobId, status: 'running', progress: 45 }),
    })
  })

  page.route('**/exports/mock.pdf', async (route: any) => {
    return route.fulfill({
      status: 200,
      headers: { 'Content-Disposition': 'attachment; filename="mock.pdf"' },
      body: 'mock pdf content',
      contentType: 'application/pdf',
    })
  })
}

test.describe('Case export', () => {
  test('export completes and user can download', async ({ page }) => {
    await mockExportRoutes(page, { readyImmediately: true })
    await page.goto('/cases/case-1')
    await page.getByRole('button', { name: 'Export case' }).click()
    await page.getByRole('button', { name: 'Start export' }).click()
    const downloadReady = page.getByText('Download ready')
    await expect(downloadReady).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download export' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('pdf')
  })

  test('navigate away and back retains progress', async ({ page }) => {
    await mockExportRoutes(page)
    await page.goto('/cases/case-1')
    await page.getByRole('button', { name: 'Export case' }).click()
    await page.getByRole('button', { name: 'Start export' }).click()

    await expect(
      page.getByRole('dialog', { name: 'Case export modal' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Tasks (4)' }).click()
    await page.getByRole('button', { name: 'Graph Explorer' }).click()
    await expect(page.getByText('Download ready')).toBeVisible({
      timeout: 5000,
    })
  })

  test('retry does not duplicate job for same params', async ({ page }) => {
    let createCalls = 0
    await page.route('**/api/tenants/**/exports', async (route: any) => {
      if (route.request().method() === 'POST') {
        createCalls += 1
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: mockJobId,
            status: 'accepted',
            startedAt: new Date().toISOString(),
          }),
        })
      }
      return route.continue()
    })

    await page.route(
      `**/api/tenants/**/exports/${mockJobId}`,
      async (route: any) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: mockJobId,
            status: 'failed',
            progress: 0,
            error: 'Network',
          }),
        })
      }
    )

    await page.goto('/cases/case-1')
    await page.getByRole('button', { name: 'Export case' }).click()
    await page.getByRole('button', { name: 'Start export' }).click()
    await expect(page.getByText('Export failed')).toBeVisible()

    await page.getByRole('button', { name: 'Retry' }).click()
    expect(createCalls).toBe(1)

    await page.getByRole('button', { name: 'Start new export' }).click()
    expect(createCalls).toBe(2)
  })
})
