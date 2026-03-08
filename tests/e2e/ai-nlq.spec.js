"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe.skip("ai-nlq generate preview", () => {
    (0, test_1.test)("renders preview sample", async ({ page }) => {
        const api = await test_1.request.newContext({ baseURL: "http://localhost:8080" });
        const response = await api.post("/generate", { data: { natural: "List nodes" } });
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        await page.setContent(`<pre id="preview">${JSON.stringify(body.preview_sample)}</pre>`);
        await (0, test_1.expect)(page.locator("#preview")).toContainText("n1");
    });
});
