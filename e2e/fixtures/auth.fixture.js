"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const test_1 = require("@playwright/test");
const test_data_1 = require("./test-data");
const AgentSessionPage_1 = require("../page-objects/AgentSessionPage");
const MultiAgentCoordinationPage_1 = require("../page-objects/MultiAgentCoordinationPage");
const ZKDeconflictionPage_1 = require("../page-objects/ZKDeconflictionPage");
const AdminTenantPage_1 = require("../page-objects/AdminTenantPage");
exports.test = test_1.test.extend({
    authenticatedPage: async ({ page }, use) => {
        await page.goto('/signin');
        await page.getByLabel(/email/i).fill(test_data_1.testUsers.analyst.email);
        await page.getByLabel(/password/i).fill(test_data_1.testUsers.analyst.password);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL('/');
        await use(page);
    },
    adminPage: async ({ page }, use) => {
        await page.goto('/signin');
        await page.getByLabel(/email/i).fill(test_data_1.testUsers.admin.email);
        await page.getByLabel(/password/i).fill(test_data_1.testUsers.admin.password);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL('/');
        await use(page);
    },
    agentSessionPage: async ({ authenticatedPage }, use) => {
        const p = new AgentSessionPage_1.AgentSessionPage(authenticatedPage);
        await use(p);
    },
    multiAgentPage: async ({ authenticatedPage }, use) => {
        const p = new MultiAgentCoordinationPage_1.MultiAgentCoordinationPage(authenticatedPage);
        await use(p);
    },
    zkPage: async ({ adminPage }, use) => {
        const p = new ZKDeconflictionPage_1.ZKDeconflictionPage(adminPage);
        await use(p);
    },
    adminTenantPage: async ({ adminPage }, use) => {
        const p = new AdminTenantPage_1.AdminTenantPage(adminPage);
        await use(p);
    },
});
var test_2 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_2.expect; } });
