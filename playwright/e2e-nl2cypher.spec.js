"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('NL→Cypher preview→approve flow', async ({ page }) => {
    await page.goto('http://localhost:3000/devtools/nl2cypher');
    await page.fill('[data-testid="nl-input"]', 'Find shortest path between A and B over follows edges');
    await page.click('[data-testid="btn-generate"]');
    await (0, test_1.expect)(page.locator('[data-testid="cypher-preview"]')).toContainText('MATCH');
    await (0, test_1.expect)(page.locator('[data-testid="plan-estimate"]')).toContainText('rows');
    await page.click('[data-testid="btn-approve"]');
    await (0, test_1.expect)(page.locator('[data-testid="sandbox-result"]')).toContainText('rows:');
});
