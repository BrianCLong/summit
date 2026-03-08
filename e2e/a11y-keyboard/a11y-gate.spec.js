"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
const harness_1 = require("./harness");
async function tabUntilFocused(page, locator, options = {}) {
    const { maxTabs = 25, reverse = false } = options;
    for (let i = 0; i < maxTabs; i++) {
        if (await locator.isFocused()) {
            return;
        }
        await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    }
    throw new Error('Focus did not reach expected element');
}
test_1.test.beforeEach(async ({ page }) => {
    await (0, harness_1.primeApp)(page);
});
(0, test_1.test)('app boot smoke: shell renders without console noise', async ({ page }) => {
    const readErrors = (0, harness_1.trackConsoleErrors)(page);
    await page.goto('/');
    await page.waitForSelector('main#main-content');
    await (0, test_1.expect)(page.getByText('IntelGraph Platform')).toBeVisible();
    await (0, test_1.expect)(page.getByRole('navigation')).toBeVisible();
    await (0, test_1.expect)(page.getByRole('main')).toBeVisible();
    await (0, test_1.expect)(page.getByRole('link', { name: 'Explore', exact: true })).toBeVisible();
    await (0, harness_1.expectNoConsoleErrors)(readErrors);
});
(0, test_1.test)('keyboard navigation: primary nav, main control, and escape modal', async ({ page, }) => {
    const readErrors = (0, harness_1.trackConsoleErrors)(page);
    await page.goto('/alerts');
    await page.waitForSelector('main#main-content');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    const navExplore = page.getByRole('link', { name: 'Explore' });
    const searchButton = page.getByRole('button', { name: /Search/ });
    const alertsSearch = page.getByPlaceholder(/Search alerts/i);
    await tabUntilFocused(page, skipLink);
    await (0, test_1.expect)(skipLink).toBeFocused();
    await tabUntilFocused(page, navExplore);
    await (0, test_1.expect)(navExplore).toBeFocused();
    await tabUntilFocused(page, searchButton);
    await (0, test_1.expect)(searchButton).toBeFocused();
    await page.keyboard.press('Enter');
    await (0, test_1.expect)(page.getByText('Type to search across entities, investigations, and more...')).toBeVisible();
    await page.keyboard.press('Escape');
    await (0, test_1.expect)(page.getByText('Type to search across entities, investigations, and more...')).toBeHidden();
    await tabUntilFocused(page, alertsSearch);
    await (0, test_1.expect)(alertsSearch).toBeFocused();
    await tabUntilFocused(page, navExplore, { reverse: true });
    await (0, test_1.expect)(navExplore).toBeFocused();
    await (0, harness_1.expectNoConsoleErrors)(readErrors);
});
(0, test_1.test)('a11y scan: fail on serious and critical violations', async ({ page }) => {
    const runScan = async (route, name) => {
        await page.goto(route);
        await page.waitForSelector('main#main-content');
        const results = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        const seriousOrCritical = (results.violations || []).filter(violation => ['serious', 'critical'].includes(violation.impact || ''));
        await (0, harness_1.writeA11yReport)(`${name}-axe`, results, 'json');
        await (0, harness_1.writeA11yReport)(`${name}-axe`, results, 'html');
        (0, test_1.expect)(seriousOrCritical).toEqual([]);
    };
    await runScan('/', 'home');
    await runScan('/alerts', 'alerts');
    // Smoke-verify mock auth is intact for reporting
    (0, test_1.expect)(harness_1.mockUser.role).toBe('admin');
});
