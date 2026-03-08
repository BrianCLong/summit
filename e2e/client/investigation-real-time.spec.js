"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const ADMIN_USER = {
    id: 'admin-001',
    email: 'admin@intelgraph.test',
    roles: ['admin', 'analyst'],
    token: 'mock-admin-jwt-token',
};
test_1.test.describe('Investigation real-time updates', () => {
    (0, test_1.test)('creates investigation and syncs entity and relationship events', async ({ page, }) => {
        const wsEvents = {
            entities: [],
            relationships: [],
        };
        page.on('websocket', (ws) => {
            ws.on('framereceived', (event) => {
                try {
                    const message = JSON.parse(event.payload.toString());
                    if (message.type === 'data' && message.payload?.data) {
                        const data = message.payload.data;
                        if (data.entityCreated) {
                            wsEvents.entities.push(data.entityCreated);
                        }
                        if (data.relationshipCreated) {
                            wsEvents.relationships.push(data.relationshipCreated);
                        }
                    }
                }
                catch {
                    // ignore non-JSON frames
                }
            });
        });
        await page.goto('/', { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');
        await page.evaluate((user) => {
            localStorage.setItem('auth_token', user.token);
            localStorage.setItem('user', JSON.stringify(user));
        }, ADMIN_USER);
        await page.goto('/investigations', { waitUntil: 'networkidle' });
        await page.click('[data-testid="create-investigation-button"]');
        const testId = `realtime-${Date.now()}`;
        await page.fill('[data-testid="investigation-title"]', `Realtime Test ${testId}`);
        await page.fill('[data-testid="investigation-description"]', 'Realtime sync test');
        await page.click('[data-testid="create-investigation-submit"]');
        await (0, test_1.expect)(page.locator('[data-testid="investigation-created"]')).toBeVisible({ timeout: 15000 });
        await page.click('[data-testid="add-entity-button"]');
        await page.fill('[data-testid="entity-label"]', 'Alpha Node');
        await page.selectOption('[data-testid="entity-type"]', 'person');
        await page.fill('[data-testid="entity-description"]', 'First test node');
        await page.click('[data-testid="entity-save"]');
        await page.click('[data-testid="add-entity-button"]');
        await page.fill('[data-testid="entity-label"]', 'Beta Node');
        await page.selectOption('[data-testid="entity-type"]', 'person');
        await page.fill('[data-testid="entity-description"]', 'Second test node');
        await page.click('[data-testid="entity-save"]');
        await (0, test_1.expect)(page.locator('[data-testid="entity-alpha-node"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[data-testid="entity-beta-node"]')).toBeVisible();
        await page.click('[data-testid="add-relationship-button"]');
        await page.selectOption('[data-testid="relationship-from"]', 'Alpha Node');
        await page.selectOption('[data-testid="relationship-to"]', 'Beta Node');
        await page.selectOption('[data-testid="relationship-type"]', 'communicates_with');
        await page.fill('[data-testid="relationship-description"]', 'Realtime link');
        await page.click('[data-testid="relationship-save"]');
        await (0, test_1.expect)(page.locator('[data-testid="relationship-alpha-node-beta-node"]')).toBeVisible();
        await page.waitForTimeout(1000);
        (0, test_1.expect)(wsEvents.entities.length).toBeGreaterThanOrEqual(2);
        (0, test_1.expect)(wsEvents.relationships.length).toBeGreaterThanOrEqual(1);
    });
});
