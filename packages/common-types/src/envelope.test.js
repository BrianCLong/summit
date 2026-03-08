"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_js_1 = require("./types.js");
(0, globals_1.describe)('envelopeSchema', () => {
    (0, globals_1.it)('validates a basic envelope', () => {
        const result = types_js_1.envelopeSchema.parse({
            tenantId: 't1',
            source: { name: 'test' },
            kind: 'ENTITY',
            type: 'Person',
            payload: {},
            observedAt: new Date().toISOString(),
            hash: 'abc',
            policyLabels: [],
            provenance: { chain: [] },
        });
        (0, globals_1.expect)(result.tenantId).toBe('t1');
    });
});
