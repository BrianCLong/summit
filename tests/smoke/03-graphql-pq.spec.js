"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('non-persisted GraphQL is rejected (enforced at 100%)', async ({ request, baseURL, }) => {
    const res = await request.post(`${baseURL}/graphql`, {
        headers: { 'Content-Type': 'application/json' },
        data: { query: '{ __typename }' },
    });
    // Per gateway middleware spec: 499 PersistedQueryRequired (or 4xx)
    (0, test_1.expect)([499, 400, 403, 415]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    (0, test_1.expect)(JSON.stringify(body)).toMatch(/PersistedQueryRequired|persisted/i);
});
