"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const SERVER_CMD = ['python', '-m', 'uvicorn', 'ai.cdis.app:app', '--port', '8080'];
function startServer() {
    const proc = (0, child_process_1.spawn)(SERVER_CMD[0], SERVER_CMD.slice(1), {
        env: { ...process.env, CAUSAL_LAB_ENABLED: 'true' },
        stdio: 'inherit',
    });
    return proc;
}
test_1.test.describe('discover → intervene → share', () => {
    (0, test_1.test)('runs the Causal Lab flow', async ({ page }) => {
        const server = startServer();
        await page.waitForTimeout(2000);
        await page.goto('file://' + path_1.default.join(process.cwd(), '..', 'ui', 'index.html'));
        await page.getByText('Discover').click();
        await page.waitForTimeout(500);
        await page.getByLabel('treatment').check();
        const slider = page.locator('#treatment-slider');
        await slider.focus();
        await slider.press('ArrowRight');
        await page.getByText('Intervene').click();
        await page.waitForTimeout(500);
        const effects = page.locator('#effects li');
        const count = await effects.count();
        (0, test_1.expect)(count).toBeGreaterThan(0);
        server.kill();
    });
});
