"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)("open case → filter → brush → save view", async ({ page }) => {
    await page.goto(process.env.PREVIEW_URL_UI);
    await page.getByRole("textbox", { name: /search/i }).fill("ransomware op");
    await page.getByRole("button", { name: /open case/i }).click();
    await page.locator("#timeline .brush").dragTo(page.locator("#timeline"), { targetPosition: { x: 300, y: 10 } });
    await page.getByRole("button", { name: /save view/i }).click();
    await (0, test_1.expect)(page.getByText(/view saved/i)).toBeVisible();
});
