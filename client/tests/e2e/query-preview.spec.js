"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Graph query builder preview', () => {
    (0, test_1.test)('streams subscription payloads when filters are added', async ({ page }) => {
        const sentMessages = [];
        page.on('websocket', (ws) => {
            ws.on('framesent', (event) => {
                try {
                    const payload = JSON.parse(event.payload.toString());
                    sentMessages.push(payload);
                }
                catch (err) {
                    // Ignore non-JSON messages from the WebSocket handshake
                    void err;
                }
            });
        });
        await page.goto('/graph');
        const previewPanel = page.getByTestId('query-builder-preview');
        await (0, test_1.expect)(previewPanel).toBeVisible();
        const quickDslInput = previewPanel.getByPlaceholder(/Quick search/i);
        await quickDslInput.fill('type:person');
        await quickDslInput.press('Enter');
        await page.waitForTimeout(750);
        const subscriptionPayload = sentMessages.find((message) => message?.type === 'subscribe' &&
            typeof message?.payload?.query === 'string' &&
            message.payload.query.includes('subscription GraphQueryPreview'));
        (0, test_1.expect)(subscriptionPayload).toBeTruthy();
        const statusText = await previewPanel.getByTestId('query-preview-status').textContent();
        (0, test_1.expect)(statusText).toBeTruthy();
    });
});
