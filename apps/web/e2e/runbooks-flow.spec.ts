import { test, expect } from './fixtures.js'

test.describe('Maestro Runbooks flow', () => {
  test('author → validate → simulate → run', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/maestro/pipelines/schema', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          $id: 'https://intelgraph.dev/schemas/maestro-runbook.json',
          type: 'object',
          properties: {
            nodes: { type: 'array' },
            edges: { type: 'array' },
          },
        }),
      })
    )

    await authenticatedPage.route('**/api/maestro/pipelines/validate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, schemaErrors: [] }),
      })
    )

    await authenticatedPage.route('**/api/maestro/pipelines/simulate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          estimate: {
            estimatedCostUSD: 0.0123,
            estimatedDurationMs: 1800,
            nodes: 3,
            edges: 2,
            taskNodes: 2,
          },
          explain: { assumptions: ['Mocked for e2e'] },
          sampledRuns: [
            {
              run: 1,
              estimatedCostUSD: 0.011,
              estimatedDurationMs: 1600,
            },
          ],
        }),
      })
    )

    await authenticatedPage.route('**/api/maestro/pipelines', async route => {
      if (route.request().method() !== 'POST') {
        return route.fallback()
      }
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'pipeline-123' }),
      })
    })

    await authenticatedPage.route('**/api/maestro/runs', async route => {
      if (route.request().method() !== 'POST') {
        return route.fallback()
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'run-123', status: 'queued' }),
      })
    })

    await authenticatedPage.goto('/maestro/runbooks')

    await authenticatedPage
      .getByTestId('runbook-name-input')
      .fill('E2E Runbook')

    await authenticatedPage.getByTestId('runbook-validate-button').click()
    await expect(authenticatedPage.getByText('Valid runbook')).toBeVisible()

    await authenticatedPage.getByTestId('runbook-simulate-button').click()
    await expect(
      authenticatedPage.getByText('Estimated cost: $0.0123')
    ).toBeVisible()
    await expect(authenticatedPage.getByText('Mocked for e2e')).toBeVisible()

    await authenticatedPage.getByTestId('runbook-run-button').click()
    await expect(authenticatedPage.getByText('Run ID:')).toBeVisible()
    await expect(authenticatedPage.getByText('run-123')).toBeVisible()
    await expect(authenticatedPage.getByText('queued')).toBeVisible()
  })
})
