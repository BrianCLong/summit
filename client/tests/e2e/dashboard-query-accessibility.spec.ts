import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Dashboard and query accessibility', () => {
  test('live activity feed toggles via keyboard and meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/dashboard');

    const liveActivityToggle = page.getByRole('button', { name: /live activity/i });
    await expect(liveActivityToggle).toBeVisible();

    await liveActivityToggle.focus();
    await page.keyboard.press('Enter');

    const liveActivityRegion = page.getByRole('region', { name: /live activity/i });
    await expect(liveActivityRegion).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[data-testid="dashboard-main"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('advanced search supports keyboard control and passes accessibility audit', async ({ page }) => {
    await page.route('**/graphql', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        try {
          const postData = request.postData();
          if (postData) {
            const body = JSON.parse(postData);
            if (body?.operationName === 'SearchEntities') {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  data: {
                    searchEntities: {
                      nodes: [
                        {
                          id: 'entity-1',
                          label: 'Mock Entity Result',
                          type: 'person',
                          description: 'Representative search result used for accessibility verification.',
                          confidence: 87,
                          updatedAt: new Date().toISOString(),
                        },
                      ],
                      totalCount: 1,
                      hasMore: false,
                    },
                  },
                }),
              });
              return;
            }
          }
        } catch (error) {
          // fall back to default handling below
        }
      }
      await route.continue();
    });

    await page.goto('/');

    await page.getByRole('button', { name: /advanced search/i }).click();

    const searchInput = page.getByRole('textbox', { name: /search entities/i });
    await expect(searchInput).toBeVisible();

    const filterToggle = page.getByRole('button', { name: /filters/i });
    await filterToggle.focus();
    await page.keyboard.press('Enter');

    const filtersDialog = page.getByRole('dialog', { name: /advanced filters/i });
    await expect(filtersDialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(filtersDialog).toBeHidden();

    await searchInput.fill('Mock entity');

    const resultsList = page.locator('[role="listbox"]');
    await expect(resultsList).toBeVisible();

    const firstResult = page.getByRole('option', { name: /mock entity result/i });
    await firstResult.focus();
    await page.keyboard.press('Enter');
    await expect(resultsList).toBeHidden();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[data-testid="advanced-search"]')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
