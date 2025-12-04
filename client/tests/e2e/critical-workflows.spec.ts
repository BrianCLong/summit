import { test, expect } from '@playwright/test';

const credentials = {
  email: 'analyst@example.com',
  password: 'SuperSecure!123',
};

async function login(page) {
  const start = Date.now();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
  const duration = Date.now() - start;
  return duration;
}

test.describe('Critical user workflows', () => {
  test('login stays within expected latency and lands on dashboard', async ({ page }) => {
    const duration = await login(page);

    await expect(
      page.getByRole('heading', { name: /IntelGraph Platform - Dashboard/i }),
    ).toBeVisible();
    expect(duration).toBeLessThan(3000);
  });

  test('graph load → edit → save/export happy path', async ({ page }) => {
    await login(page);

    await page.goto('/graph');
    await expect(
      page.getByRole('heading', { name: /Interactive Graph Explorer/i }),
    ).toBeVisible();

    const statsLocator = page.getByText(/Nodes:\s+\d+ \| Edges:/i).first();
    const initialStats = await statsLocator.textContent();

    await page.getByRole('button', { name: /controls/i }).click();
    await expect(page.getByLabel(/Search entities/i)).toBeVisible();

    await page.getByRole('button', { name: /add node/i }).click();

    await expect
      .poll(async () => statsLocator.textContent())
      .not.toEqual(initialStats);

    await page.getByRole('button', { name: /reset/i }).click();
    await expect
      .poll(async () => statsLocator.textContent())
      .toEqual(initialStats);

    const dataUrl = await page.$eval('canvas', (canvas) => canvas?.toDataURL?.('image/png'));
    expect(dataUrl?.startsWith('data:image/png;base64')).toBe(true);
  });

  test('AI copilot assists with quick analysis under latency budget', async ({ page }) => {
    await login(page);
    await page.goto('/copilot');

    await expect(page.getByRole('heading', { name: /Intelligent Copilot/i })).toBeVisible();

    const promptInput = page.getByPlaceholder(/Ask a question or request analysis/i);
    await promptInput.fill('Analyze network signals for anomalies');

    const sendStarted = Date.now();
    await promptInput.press('Enter');

    const aiResponse = page.getByText(/Network Analysis Complete|analysis/i).first();
    await expect(aiResponse).toBeVisible({ timeout: 6500 });

    const latency = Date.now() - sendStarted;
    expect(latency).toBeLessThan(6500);
  });
});
