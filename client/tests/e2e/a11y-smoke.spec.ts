import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', "a11y.smoke@intelgraph.test");
  await page.fill('input[type="password"]', "password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

async function runA11yCheck(page, name) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const seriousOrWorse = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );

  expect(seriousOrWorse, `${name} should not have serious axe violations`).toEqual([]);
}

test.describe("Accessibility smoke", () => {
  test("runs axe across key routes", async ({ page }) => {
    await page.goto("/login");
    await runA11yCheck(page, "Login");

    await login(page);

    const authenticatedRoutes = [
      { path: "/dashboard", name: "Dashboard" },
      { path: "/graph", name: "Graph Explorer" },
      { path: "/copilot", name: "Copilot" },
    ];

    for (const route of authenticatedRoutes) {
      await page.goto(route.path);
      await runA11yCheck(page, route.name);
    }
  });
});
