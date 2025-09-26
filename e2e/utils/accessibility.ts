import type { Locator, Page } from '@playwright/test';
import { checkA11y, injectAxe } from '@axe-core/playwright';

export interface AccessibilityOptions {
  context?: string | Locator;
  timeout?: number;
}

export async function runAccessibilityScan(page: Page, options: AccessibilityOptions = {}): Promise<void> {
  await injectAxe(page);
  await checkA11y(page, options.context ?? undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true },
    axeOptions: {
      resultTypes: ['violations'],
    },
    timeout: options.timeout ?? 10_000,
  });
}
