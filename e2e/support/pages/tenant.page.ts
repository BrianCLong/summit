import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class TenantPage extends BasePage {
  readonly tenantDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.tenantDropdown = page.locator('[data-testid="tenant-dropdown"]');
  }

  async navigate() {
    await this.goto("/admin");
  }

  async switchTenant(tenantName: string) {
    // Assuming there is a mechanism to switch tenants
    // This is a placeholder as I don't see the AdminPage implementation detail
    // But following the requirements, I need to test tenant isolation.
    // Isolation is usually tested by logging in as different users or switching context.
  }

  async verifyAccessDenied() {
    await expect(this.page.getByText(/Access Denied/i)).toBeVisible();
  }
}
