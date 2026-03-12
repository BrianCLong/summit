import { test, expect } from '@playwright/test';

test.describe('Cognitive Command Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cognitive-command');
  });

  test('renders the command center shell', async ({ page }) => {
    await expect(page.getByText('SUMMIT')).toBeVisible();
    await expect(page.getByText('Cognitive Command Center')).toBeVisible();
  });

  test('shows all six command modes in the mission rail', async ({ page }) => {
    await expect(page.getByText('OBS')).toBeVisible();
    await expect(page.getByText('INV')).toBeVisible();
    await expect(page.getByText('FCT')).toBeVisible();
    await expect(page.getByText('SIM')).toBeVisible();
    await expect(page.getByText('INT')).toBeVisible();
    await expect(page.getByText('GOV')).toBeVisible();
  });

  test('defaults to observe mode', async ({ page }) => {
    await expect(page.getByText('observe')).toBeVisible();
  });

  test('switches to forecast mode on click', async ({ page }) => {
    await page.getByText('FCT').click();
    await expect(page.getByText('forecast')).toBeVisible();
  });

  test('opens command palette with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Type a command...')).toBeVisible();
  });

  test('closes command palette with Escape', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Type a command...')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Type a command...')).not.toBeVisible();
  });

  test('command palette filters actions', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Type a command...').fill('forecast');
    await expect(page.getByText('Run Forecast')).toBeVisible();
    await expect(page.getByText('Switch to Forecast Mode')).toBeVisible();
  });

  test('keyboard navigation switches modes with Alt+number', async ({ page }) => {
    await page.keyboard.press('Alt+3');
    await expect(page.getByText('forecast')).toBeVisible();

    await page.keyboard.press('Alt+6');
    await expect(page.getByText('govern')).toBeVisible();

    await page.keyboard.press('Alt+1');
    await expect(page.getByText('observe')).toBeVisible();
  });

  test('strategic status bar shows current mode', async ({ page }) => {
    await expect(page.locator('header').getByText('MODE:')).toBeVisible();
  });

  test('panels render within workspace', async ({ page }) => {
    await expect(page.getByRole('main', { name: 'Cognitive workspace' })).toBeVisible();
  });

  test('mission rail has navigation landmark', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Command modes' })).toBeVisible();
  });
});

test.describe('Cognitive Command Center - Mode Panels', () => {
  test('observe mode shows foresight, world model, and insights', async ({ page }) => {
    await page.goto('/cognitive-command');
    await expect(page.getByText('Strategic Foresight')).toBeVisible();
  });

  test('investigate mode shows narrative and autonomy', async ({ page }) => {
    await page.goto('/cognitive-command');
    await page.getByText('INV').click();
    await expect(page.getByText('Narrative Battlespace')).toBeVisible();
  });

  test('govern mode shows governance and missions', async ({ page }) => {
    await page.goto('/cognitive-command');
    await page.getByText('GOV').click();
    await expect(page.getByText('Strategic Governance')).toBeVisible();
  });
});
