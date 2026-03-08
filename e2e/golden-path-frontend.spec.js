"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const TEST_USER = {
    id: 'e2e-analyst-001',
    email: 'analyst@intelgraph.test',
    roles: ['analyst'],
    token: 'mock-e2e-jwt-token',
};
async function authenticateViaLocalStorage(page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((user) => {
        localStorage.setItem('auth_token', user.token);
        localStorage.setItem('user', JSON.stringify(user));
    }, TEST_USER);
}
test_1.test.describe('Golden Path: Consolidated Frontend', () => {
    test_1.test.use({ viewport: { width: 1440, height: 900 } });
    test_1.test.beforeEach(async ({ page }) => {
        await authenticateViaLocalStorage(page);
    });
    (0, test_1.test)('analyst navigates app shell -> cases -> case workspace without crash', async ({ page, }) => {
        await page.goto('/cases', { waitUntil: 'domcontentloaded' });
        await (0, test_1.expect)(page.locator('#root')).toBeAttached({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Case Management')).toBeVisible({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Something went wrong')).toHaveCount(0);
        const firstCase = page.locator('h3.text-lg').first();
        await (0, test_1.expect)(firstCase).toBeVisible({ timeout: 10_000 });
        await firstCase.click();
        await (0, test_1.expect)(page).toHaveURL(/\/cases\/.+/, { timeout: 10_000 });
        await (0, test_1.expect)(page.locator('button:has-text("Go back"), button:has-text("Overview")').first()).toBeVisible({ timeout: 20_000 });
        const goBack = page.getByRole('button', { name: 'Go back' });
        if (await goBack.isVisible().catch(() => false)) {
            await (0, test_1.expect)(goBack).toBeVisible();
            return;
        }
        await (0, test_1.expect)(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByRole('button', { name: /Graph Explorer/ })).toBeVisible();
        await (0, test_1.expect)(page.getByText('Something went wrong')).toHaveCount(0);
    });
    (0, test_1.test)('search workflow: filter cases list without crash', async ({ page }) => {
        await page.goto('/cases', { waitUntil: 'domcontentloaded' });
        await (0, test_1.expect)(page.getByText('Case Management')).toBeVisible({ timeout: 10_000 });
        const searchInput = page.getByPlaceholder('Search cases by title, description, or tags...');
        await (0, test_1.expect)(searchInput).toBeVisible({ timeout: 10_000 });
        await searchInput.fill('APT');
        await (0, test_1.expect)(page.locator('h3.text-lg').first()).toBeVisible({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Something went wrong')).toHaveCount(0);
    });
    (0, test_1.test)('app shell loads critical UI components', async ({ page }) => {
        await page.goto('/cases', { waitUntil: 'domcontentloaded' });
        await (0, test_1.expect)(page.locator('#root')).toBeAttached({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Intelligence', { exact: true })).toBeVisible({
            timeout: 10_000,
        });
        await (0, test_1.expect)(page.getByText('Welcome back')).toBeVisible({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Critical condition detected')).toBeVisible({ timeout: 10_000 });
        await (0, test_1.expect)(page.getByText('Something went wrong')).toHaveCount(0);
    });
});
