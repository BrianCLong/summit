import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  expectNoConsoleErrors,
  mockUser,
  primeApp,
  trackConsoleErrors,
  writeA11yReport,
} from "./harness";

async function tabUntilFocused(
  page: Page,
  locator: Locator,
  options: { maxTabs?: number; reverse?: boolean } = {}
) {
  const { maxTabs = 25, reverse = false } = options;
  for (let i = 0; i < maxTabs; i++) {
    if (await locator.isFocused()) {
      return;
    }
    await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
  }
  throw new Error("Focus did not reach expected element");
}

test.beforeEach(async ({ page }) => {
  await primeApp(page);
});

test("app boot smoke: shell renders without console noise", async ({ page }) => {
  const readErrors = trackConsoleErrors(page);

  await page.goto("/");
  await page.waitForSelector("main#main-content");

  await expect(page.getByText("IntelGraph Platform")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore", exact: true })).toBeVisible();

  await expectNoConsoleErrors(readErrors);
});

test("keyboard navigation: primary nav, main control, and escape modal", async ({ page }) => {
  const readErrors = trackConsoleErrors(page);

  await page.goto("/alerts");
  await page.waitForSelector("main#main-content");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  const navExplore = page.getByRole("link", { name: "Explore" });
  const searchButton = page.getByRole("button", { name: /Search/ });
  const alertsSearch = page.getByPlaceholder(/Search alerts/i);

  await tabUntilFocused(page, skipLink);
  await expect(skipLink).toBeFocused();

  await tabUntilFocused(page, navExplore);
  await expect(navExplore).toBeFocused();

  await tabUntilFocused(page, searchButton);
  await expect(searchButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Type to search across entities, investigations, and more...")
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Type to search across entities, investigations, and more...")
  ).toBeHidden();

  await tabUntilFocused(page, alertsSearch);
  await expect(alertsSearch).toBeFocused();

  await tabUntilFocused(page, navExplore, { reverse: true });
  await expect(navExplore).toBeFocused();

  await expectNoConsoleErrors(readErrors);
});

test("a11y scan: fail on serious and critical violations", async ({ page }) => {
  const runScan = async (route: string, name: string) => {
    await page.goto(route);
    await page.waitForSelector("main#main-content");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = (results.violations || []).filter((violation) =>
      ["serious", "critical"].includes(violation.impact || "")
    );

    await writeA11yReport(`${name}-axe`, results, "json");
    await writeA11yReport(`${name}-axe`, results, "html");

    expect(seriousOrCritical).toEqual([]);
  };

  await runScan("/", "home");
  await runScan("/alerts", "alerts");

  // Smoke-verify mock auth is intact for reporting
  expect(mockUser.role).toBe("admin");
});
