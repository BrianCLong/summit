import { test, expect } from '@playwright/test';

test.describe('MC Sovereign Console v0.3.9', () => {
  test('toggles flags with persisted-only & audit headers', async ({
    page,
  }) => {
    await page.goto('/');
    // Pretend Toggle
    await page.getByText('Feature Flags').scrollIntoViewIfNeeded();
    const save = page.getByRole('button', { name: 'Save Flags' });
    const [req] = await Promise.all([
      page.waitForRequest(
        (r) =>
          r.url().includes('/api/mc/config/flags') && r.method() === 'POST',
      ),
      save.click(),
    ]);
    expect(req.headers()['x-persisted-only']).toBe('true');
    expect(req.headers()['x-provenance-capture']).toBe('true');
  });

  test('composite weights saved via persisted mutation', async ({ page }) => {
    await page.goto('/');
    const save = page.getByRole('button', { name: 'Save Weights' });
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.postData()?.includes('weights')),
      save.click(),
    ]);
    expect(req.url()).toContain('/api/mc/canary/weights');
  });
});
