"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const base = 'http://localhost:7011';
(0, test_1.test)('prov-ledger manifest endpoint (real)', async ({ request }) => {
    const m = await (await request.get(`${base}/ledger/export/demo-case`)).json();
    (0, test_1.expect)(m.manifest).toBeTruthy();
});
