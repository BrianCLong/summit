import { test, expect, Page } from '@playwright/test';

type ExperimentResponse = {
  data: {
    uiExperiments: Array<{
      id: string;
      tenantId: string;
      featureKey: string;
      description: string;
      isActive: boolean;
      updatedAt: string;
      variations: Array<{
        name: string;
        weight: number;
        config: Record<string, unknown>;
      }>;
    }>;
  };
};

const experimentPayload: ExperimentResponse = {
  data: {
    uiExperiments: [
      {
        id: 'exp-dashboard-layout',
        tenantId: 'default_tenant',
        featureKey: 'dashboard-layout',
        description: 'Playwright stub for UI experiment',
        isActive: true,
        updatedAt: new Date().toISOString(),
        variations: [
          { name: 'control', weight: 0.5, config: { layout: 'legacy' } },
          { name: 'compact', weight: 0.5, config: { layout: 'compact' } },
        ],
      },
    ],
  },
};

async function stubExperimentRequest(page: Page) {
  await page.route('**/graphql', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    try {
      const payload = route.request().postDataJSON();
      if (payload?.operationName === 'UIExperiments') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(experimentPayload),
        });
        return;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse GraphQL payload for experiment stub', error);
    }
    return route.continue();
  });
}

async function getExperimentEvents(page: Page) {
  return page.evaluate(() => (window as any).__otelExperimentEvents ?? []);
}

test.describe('dashboard layout A/B experiment', () => {
  test.beforeEach(async ({ page }) => {
    await stubExperimentRequest(page);
  });

  test('renders control variant with telemetry events', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('ui-experiments:user-id', 'playwright-user');
      window.localStorage.setItem('PUSHTELL-dashboard-layout', 'control');
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Stats Overview' })).toBeVisible();
    await expect(page.getByText('Investigator Top Signals')).toHaveCount(0);

    const events = await getExperimentEvents(page);
    expect(events.some((event: any) => event.type === 'exposure' && event.variant === 'control')).toBeTruthy();

    await page.getByRole('button', { name: 'Open Grafana' }).click();
    const interactionEvents = await getExperimentEvents(page);
    expect(
      interactionEvents.some(
        (event: any) =>
          event.type === 'interaction' &&
          event.variant === 'control' &&
          event.interaction === 'open_grafana',
      ),
    ).toBeTruthy();
  });

  test('renders compact variant layout and tracks interactions', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('ui-experiments:user-id', 'playwright-user');
      window.localStorage.setItem('PUSHTELL-dashboard-layout', 'compact');
    });

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'System Health Summary' })).toBeVisible();
    await expect(page.getByText('Investigator Top Signals')).toBeVisible();

    const events = await getExperimentEvents(page);
    expect(events.some((event: any) => event.type === 'exposure' && event.variant === 'compact')).toBeTruthy();

    await page.getByRole('button', { name: 'Open Grafana' }).click();
    const interactionEvents = await getExperimentEvents(page);
    expect(
      interactionEvents.some(
        (event: any) =>
          event.type === 'interaction' &&
          event.variant === 'compact' &&
          event.interaction === 'open_grafana',
      ),
    ).toBeTruthy();
  });
});
