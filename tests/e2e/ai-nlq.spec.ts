import { test, expect, request } from "@playwright/test";

test.describe.skip("ai-nlq generate preview", () => {
  test("renders preview sample", async ({ page }) => {
    const api = await request.newContext({ baseURL: "http://localhost:8080" });
    const response = await api.post("/generate", { data: { natural: "List nodes" } });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    await page.setContent(`<pre id="preview">${JSON.stringify(body.preview_sample)}</pre>`);
    await expect(page.locator("#preview")).toContainText("n1");
  });
});
