import { expect, test } from '@playwright/test';

test('supports language switching and RTL layout', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1');

  await expect(page.locator('h1')).toHaveText('IntelGraph');
  await expect(page.getByRole('button', { name: 'Neighborhood Mode' })).toBeVisible();

  const selector = page.getByTestId('language-select');

  await selector.selectOption('es');
  await expect(page.getByRole('button', { name: 'Modo de vecindario' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Inicio de sesión de operaciones' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Línea de tiempo de agentes' })).toBeVisible();

  await selector.selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'وضع الجوار' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'معالج الاستيعاب' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'الخط الزمني للوكلاء' })).toBeVisible();
});
