import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

const buildThemeResponse = (overrides: Partial<Record<'light' | 'dark', Partial<Record<string, string>>>> = {}) => ({
  data: {
    tenantTheme: {
      tenantId: 'playwright-tenant',
      name: 'Playwright Preview',
      updatedAt: new Date().toISOString(),
      light: {
        primary: '#0052A4',
        primaryContrast: '#FFFFFF',
        secondary: '#2481D7',
        accent: '#F97316',
        background: '#F5F7FF',
        surface: '#FFFFFF',
        surfaceMuted: '#E2E8F0',
        border: '#CBD5F5',
        text: '#102042',
        textMuted: '#4B5563',
        success: '#0EA5E9',
        warning: '#D97706',
        danger: '#DC2626',
        focus: '#4338CA',
        fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
        fontHeading: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
        shadowSm: '0 1px 3px rgba(29, 78, 216, 0.12)',
        shadowMd: '0 12px 24px rgba(29, 78, 216, 0.12)',
        shadowLg: '0 18px 40px rgba(79, 70, 229, 0.18)',
        radiusSm: '6px',
        radiusMd: '12px',
        radiusLg: '20px',
        radiusPill: '999px',
        ...overrides.light,
      },
      dark: {
        primary: '#8FB1FF',
        primaryContrast: '#050914',
        secondary: '#C4B5FD',
        accent: '#FDBA74',
        background: '#050914',
        surface: '#10162A',
        surfaceMuted: '#1B253F',
        border: '#1E3A8A',
        text: '#E5E7EB',
        textMuted: '#9CA3AF',
        success: '#38BDF8',
        warning: '#FBBF24',
        danger: '#F87171',
        focus: '#60A5FA',
        fontBody: "'Inter', 'Segoe UI', system-ui, sans-serif",
        fontHeading: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
        fontMono: "'JetBrains Mono', 'SFMono-Regular', ui-monospace, monospace",
        shadowSm: '0 1px 3px rgba(8, 47, 73, 0.6)',
        shadowMd: '0 12px 24px rgba(8, 47, 73, 0.55)',
        shadowLg: '0 18px 40px rgba(8, 47, 73, 0.5)',
        radiusSm: '6px',
        radiusMd: '12px',
        radiusLg: '20px',
        radiusPill: '999px',
        ...overrides.dark,
      },
    },
  },
});

const interceptThemeQuery = async (page, themeOverrides = {}) => {
  const response = buildThemeResponse(themeOverrides);
  await page.route('**/graphql', async (route, request) => {
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as { operationName?: string };
      if (body?.operationName === 'GetTenantTheme') {
        await route.fulfill({ json: response });
        return;
      }
    }
    await route.continue();
  });
};

test.describe('Tenant theming engine', () => {
  test('applies tenant CSS variables for light mode', async ({ page }) => {
    await interceptThemeQuery(page);
    await page.goto('/');
    await page.waitForSelector('body');

    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim().toLowerCase(),
    );
    const background = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim().toLowerCase(),
    );

    expect(primary).toBe('#0052a4');
    expect(background).toBe('#f5f7ff');

    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('respects prefers-color-scheme dark tokens', async ({ page }) => {
    await interceptThemeQuery(page, {
      dark: {
        background: '#0b1220',
        text: '#f8fafc',
      },
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForTimeout(250);

    const modeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme-mode'));
    const background = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim().toLowerCase(),
    );
    const textColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim().toLowerCase(),
    );

    expect(modeAttr).toBe('dark');
    expect(background).toBe('#0b1220');
    expect(textColor).toBe('#f8fafc');
  });
});
