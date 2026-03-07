import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ZKDeconflictionPage extends BasePage {
  readonly initiateButton: Locator;
  readonly intersectionResult: Locator;
  readonly privacyBadge: Locator;

  constructor(page: Page) {
    super(page);
    this.initiateButton = page.getByRole("button", { name: /start deconfliction|initiate zk/i });
    this.intersectionResult = page.locator('[data-testid="intersection-result"]');
    this.privacyBadge = page.getByText(/zero knowledge|private/i);
  }

  async goto() {
    await super.goto("/admin/consistency");
  }

  async initiateDeconfliction() {
    await this.initiateButton.click();
  }

  async verifyIntersectionResult() {
    await expect(this.intersectionResult).toBeVisible();
  }

  async verifyPrivacyPreserved() {
    await expect(this.privacyBadge).toBeVisible();
  }
}
