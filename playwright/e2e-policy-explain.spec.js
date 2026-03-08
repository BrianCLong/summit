"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('policy explain denies with reason', async ({ request }) => {
    const res = await request.post('http://localhost:4000/policy/explain', { data: { query: '{ dangerousOp }' } });
    (0, test_1.expect)(res.status()).toBe(200);
    const json = await res.json();
    (0, test_1.expect)(json.allowed).toBeFalsy();
    (0, test_1.expect)(json.reason).toContain('Denied');
});
