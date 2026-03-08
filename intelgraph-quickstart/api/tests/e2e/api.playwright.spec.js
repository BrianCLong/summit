"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const url = 'http://localhost:4000/graphql';
(0, test_1.test)('search persons returns results', async ({ request }) => {
    const res = await request.post(url, {
        data: { query: '{ searchPersons(q:"a", limit: 3){ id name } }' },
        headers: { 'x-tenant': 'demo-tenant' },
    });
    (0, test_1.expect)(res.ok()).toBeTruthy();
    const body = await res.json();
    (0, test_1.expect)(Array.isArray(body.data.searchPersons)).toBe(true);
});
