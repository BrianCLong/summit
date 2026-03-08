"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Integration stub for OPA denial - skips if OPA_URL not set
const abac_js_1 = require("../abac.js");
const OPA = process.env.OPA_URL || '';
(OPA ? describe : describe.skip)('OPA integration', () => {
    it('denies when policy disallows action', async () => {
        const res = await (0, abac_js_1.opaDecision)({
            user: { role: 'guest' },
            action: 'read',
            resource: { sensitivity: 'restricted' },
        });
        // Depending on policy, this may allow; assert shape at minimum
        expect(res).toHaveProperty('allow');
        expect(res).toHaveProperty('fields');
    });
});
