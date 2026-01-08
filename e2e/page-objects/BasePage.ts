import { type Page, expect } from "@playwright/test";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForUrl(url: string | RegExp) {
    await this.page.waitForURL(url);
  }

  async takeScreenshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`);
  }

  /**
   * Checks accessibility violations using axe-core (requires @axe-core/playwright)
   */
  async checkAccessibility() {
    try {
      // Placeholder: Requires @axe-core/playwright to be installed
      // import { injectAxe, checkA11y } from 'axe-playwright';
      // await injectAxe(this.page);
      // await checkA11y(this.page);
      console.warn(
        "Accessibility check skipped: axe-playwright integration pending package installation."
      );
    } catch (e) {
      console.error("Accessibility check failed:", e);
    }
  }
}
