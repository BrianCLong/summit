"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trust_js_1 = require("../src/conductor/contracts/trust.js");
test('rejects expired contract', async () => {
    await expect((0, trust_js_1.verifyTrustContract)({
        providerTenant: 'a',
        consumerTenant: 'b',
        scope: {},
        residency: 'EU',
        expiresAt: '2000-01-01',
        signature: 'x',
    })).rejects.toBeTruthy();
});
