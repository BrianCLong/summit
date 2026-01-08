import { test as base } from "@playwright/test";
import { testUsers } from "./test-data";
import { AgentSessionPage } from "../page-objects/AgentSessionPage";
import { MultiAgentCoordinationPage } from "../page-objects/MultiAgentCoordinationPage";
import { ZKDeconflictionPage } from "../page-objects/ZKDeconflictionPage";
import { AdminTenantPage } from "../page-objects/AdminTenantPage";

type MyFixtures = {
  authenticatedPage: any;
  adminPage: any;
  agentSessionPage: AgentSessionPage;
  multiAgentPage: MultiAgentCoordinationPage;
  zkPage: ZKDeconflictionPage;
  adminTenantPage: AdminTenantPage;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/signin");
    await page.getByLabel(/email/i).fill(testUsers.analyst.email);
    await page.getByLabel(/password/i).fill(testUsers.analyst.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/");
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await page.goto("/signin");
    await page.getByLabel(/email/i).fill(testUsers.admin.email);
    await page.getByLabel(/password/i).fill(testUsers.admin.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/");
    await use(page);
  },
  agentSessionPage: async ({ authenticatedPage }, use) => {
    const p = new AgentSessionPage(authenticatedPage);
    await use(p);
  },
  multiAgentPage: async ({ authenticatedPage }, use) => {
    const p = new MultiAgentCoordinationPage(authenticatedPage);
    await use(p);
  },
  zkPage: async ({ adminPage }, use) => {
    // ZK usually requires admin or higher privs
    const p = new ZKDeconflictionPage(adminPage);
    await use(p);
  },
  adminTenantPage: async ({ adminPage }, use) => {
    const p = new AdminTenantPage(adminPage);
    await use(p);
  },
});

export { expect } from "@playwright/test";
