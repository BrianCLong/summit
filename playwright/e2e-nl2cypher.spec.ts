import { test, expect } from "@playwright/test";

test("NL→Cypher preview→approve flow", async ({ page }) => {
  await page.goto("http://localhost:3000/devtools/nl2cypher");
  await page.fill(
    '[data-testid="nl-input"]',
    "Find shortest path between A and B over follows edges"
  );
  await page.click('[data-testid="btn-generate"]');
  await expect(page.locator('[data-testid="cypher-preview"]')).toContainText("MATCH");
  await expect(page.locator('[data-testid="plan-estimate"]')).toContainText("rows");
  await page.click('[data-testid="btn-approve"]');
  await expect(page.locator('[data-testid="sandbox-result"]')).toContainText("rows:");
});
