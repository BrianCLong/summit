import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminTenantPage extends BasePage {
  readonly tenantList: Locator;
  readonly createTenantButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tenantList = page.locator('[data-testid="tenant-list"]');
    this.createTenantButton = page.getByRole("button", { name: /create tenant/i });
  }

  async goto() {
    await super.goto("/admin");
  }

  async verifyTenantListVisible() {
    await expect(this.tenantList).toBeVisible();
  }

  async verifyAccessDenied() {
    await expect(this.page.locator("text=Access Denied")).toBeVisible();
  }
}
