"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abac_1 = require("../../src/abac");
test('deny on OPA down', async () => {
    process.env.OPA_URL = 'http://localhost:5999/v1/data/abac/allow';
    const ok = await (0, abac_1.allow)({ tenantId: 't' }, 'read', { type: 'person', id: 'x' });
    expect(ok).toBe(false);
});
