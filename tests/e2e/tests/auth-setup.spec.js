"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AUTH_STATE_PATH = path_1.default.join(__dirname, '../auth-state.json');
// Run serially so we only persist a single canonical auth state.
test_1.test.describe.configure({ mode: 'serial' });
(0, test_1.test)('bootstrap authenticated storage state', async ({ page }) => {
    // Ensure we start from a clean auth state snapshot
    if (fs_1.default.existsSync(AUTH_STATE_PATH)) {
        fs_1.default.rmSync(AUTH_STATE_PATH);
    }
    const email = process.env.E2E_TEST_EMAIL || 'test@intelgraph.ai';
    const password = process.env.E2E_TEST_PASSWORD || 'test-password-123';
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await (0, test_1.expect)(page).not.toHaveURL(/login/, { timeout: 30000 });
    await (0, test_1.expect)(page).toHaveURL(/(dashboard|home|maestro)/, { timeout: 30000 });
    fs_1.default.mkdirSync(path_1.default.dirname(AUTH_STATE_PATH), { recursive: true });
    await page.context().storageState({ path: AUTH_STATE_PATH });
});
