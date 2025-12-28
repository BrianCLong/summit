import { test, expect, type Page } from '@playwright/test';

const userResponse = {
  id: 'e2e-user',
  name: 'E2E User',
  role: 'analyst',
};

const statusResponse = (system: string) => ({
  system,
  status: 'green',
  summary: 'Nominal',
  updatedAt: new Date().toISOString(),
  evidence: [],
});

const mockAuth = async (page: Page) => {
  await page.route('**/users/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userResponse),
    }),
  );
};

const mockStatusGreen = async (page: Page) => {
  await page.route('**/internal/**/status', route => {
    const url = route.request().url();
    const match = url.match(/internal\/([^/]+)\/status/);
    const system = match?.[1] ?? 'unknown';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(statusResponse(system)),
    });
  });
};

const mockStatusFailure = async (page: Page) => {
  await page.route('**/internal/**/status', route =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Service unavailable' }),
    }),
  );
};

test.describe('Tier 0 - First-Load & Access Contract', () => {
  test('redirects unauthenticated users to a clear sign-in state', async ({
    page,
  }) => {
    await page.route('**/users/me', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Sign In' }),
      {
        message:
          'Sign-in screen should render instead of a blank or misleading state.',
      },
    ).toBeVisible();
    await expect(
      page.getByText('Enter your credentials to access the platform'),
      { message: 'Access gating should explain what is required.' },
    ).toBeVisible();
    await expect(
      page.getByText('Demo Credentials:'),
      { message: 'Initial access state should surface explicit guidance.' },
    ).toBeVisible();
  });

  test('shows explicit errors when sign-in fails', async ({ page }) => {
    await page.route('**/users/me', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/auth/login', route =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      }),
    );

    await page.goto('/signin');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(
      page.getByText('Invalid credentials'),
      { message: 'Authentication failures must be explicit and non-deceptive.' },
    ).toBeVisible();
  });
});

test.describe('Tier 0 - Core Dashboard Truth Contract', () => {
  test('command center dashboard exposes provenance, time window, and units', async ({
    page,
  }) => {
    await mockAuth(page);
    await mockStatusGreen(page);

    await page.goto('/dashboards/command-center');

    await expect(page.getByTestId('command-center-truth-panel')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('command-center-provenance')).toBeVisible({
      message: 'Provenance labels must be visible for KPI data.',
    });
    await expect(page.getByTestId('command-center-window')).toBeVisible({
      message: 'Time window context must be visible for KPIs.',
    });
    await expect(page.getByTestId('command-center-units')).toBeVisible({
      message: 'Units must be declared for KPI metrics.',
    });

    await expect(
      page.getByText('Response Rate'),
      { message: 'Core KPI names must render for the dashboard.' },
    ).toBeVisible();
    await expect(
      page.getByText('last hour'),
      { message: 'KPI change context must include its time window.' },
    ).toBeVisible();
  });

  test('advanced dashboard declares sandbox provenance and read-only limits', async ({
    page,
  }) => {
    await mockAuth(page);
    await mockStatusGreen(page);

    await page.goto('/dashboards/advanced');

    await expect(page.getByTestId('advanced-dashboard-truth-panel')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('advanced-dashboard-provenance')).toBeVisible({
      message: 'Advanced dashboard must label simulated data sources.',
    });
    await expect(page.getByTestId('advanced-dashboard-window')).toBeVisible({
      message: 'Advanced dashboard must disclose time-window semantics.',
    });
    await expect(page.getByTestId('advanced-dashboard-units')).toBeVisible({
      message: 'Advanced dashboard must disclose metric units.',
    });
    await expect(page.getByTestId('advanced-dashboard-safety-note')).toBeVisible({
      message: 'Governance constraints must remain visible to operators.',
    });
  });
});

test.describe('Tier 1 - Read-Only Interaction Contract', () => {
  test('disabled actions are visible and explained', async ({ page }) => {
    await mockAuth(page);
    await mockStatusGreen(page);

    await page.goto('/dashboards/command-center');

    const disabledAction = page.getByTestId('command-center-disabled-action');
    await expect(disabledAction).toBeDisabled({
      message: 'Autonomy-adjacent controls must remain disabled by default.',
    });
    await expect(
      page.getByTestId('command-center-disabled-explainer'),
      { message: 'Disabled controls must include an explicit explanation.' },
    ).toBeVisible();
  });
});

test.describe('Tier 0 - Failure & Degradation Contract', () => {
  test('backend status failures surface an honest global banner', async ({
    page,
  }) => {
    await mockAuth(page);
    await mockStatusFailure(page);

    await page.goto('/dashboards/command-center');

    await expect(
      page.getByText('Status unavailable'),
      {
        message:
          'Operational failures must surface an explicit degraded-state banner.',
      },
    ).toBeVisible();
    await expect(
      page.getByText('Backend telemetry failed; data may be stale or incomplete.'),
      { message: 'Failure messaging must explain the trust impact.' },
    ).toBeVisible();
  });
});

test.describe('Tier 1 - Core Dashboard Empty State Contract', () => {
  test('supply chain dashboard explains the empty state explicitly', async ({
    page,
  }) => {
    await mockAuth(page);
    await mockStatusGreen(page);

    await page.goto('/dashboards/supply-chain');

    await expect(
      page.getByText('Supply Chain dashboard under construction'),
      {
        message:
          'Empty states must explicitly explain why data is unavailable.',
      },
    ).toBeVisible();
    await expect(
      page.getByText('This will show supply chain risk analysis and monitoring'),
    ).toBeVisible();
  });
});
