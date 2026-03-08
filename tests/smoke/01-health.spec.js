"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('health endpoint returns ok', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/healthz`);
    (0, test_1.expect)(res.ok()).toBeTruthy();
    const body = await res.text();
    (0, test_1.expect)(body).toMatch(/ok|healthy/i);
});
(0, test_1.test)('version endpoint present', async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/version`);
    (0, test_1.expect)(res.ok()).toBeTruthy();
    const txt = await res.text();
    (0, test_1.expect)(txt).toMatch(/2\.5\.0/);
});
