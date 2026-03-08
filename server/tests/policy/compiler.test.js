"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const compiler_js_1 = require("../../src/policy/compiler.js");
const types_js_1 = require("../../src/policy/types.js");
(0, globals_1.describe)('PolicyCompiler', () => {
    let compiler;
    (0, globals_1.beforeEach)(() => {
        compiler = compiler_js_1.PolicyCompiler.getInstance();
    });
    const mockAuthority = {
        id: 'Auth-1',
        name: 'Auth One',
        type: types_js_1.PolicyType.AUTHORITY,
        jurisdiction: 'US',
        issuer: 'Court',
        clauses: [{ id: 'C1', text: 'Search allowed' }],
        selectors: [{ type: 'entity', value: 'Person', allow: true }],
        retention: 'forever',
        effectiveFrom: new Date('2023-01-01')
    };
    const mockLicense = {
        id: 'Lic-1',
        name: 'Lic One',
        type: types_js_1.PolicyType.LICENSE,
        jurisdiction: 'Internal',
        licensor: 'Legal',
        clauses: [],
        selectors: [],
        retention: 'P30D',
        effectiveFrom: new Date('2023-01-01'),
        grants: ['read'],
        revocations: ['export']
    };
    (0, globals_1.it)('should compile deterministic IR hash', () => {
        const ir1 = compiler.compile([mockAuthority]);
        const ir2 = compiler.compile([mockAuthority]);
        (0, globals_1.expect)(ir1.hash).toBe(ir2.hash);
        (0, globals_1.expect)(ir1.activePolicies).toContain('Auth-1');
    });
    (0, globals_1.it)('should enforce retention limit (shortest wins)', () => {
        const ir = compiler.compile([mockAuthority, mockLicense]);
        // mockAuthority is forever (-1), mockLicense is P30D (30 days)
        // 30 days in seconds = 30 * 24 * 3600 = 2592000
        (0, globals_1.expect)(ir.retentionLimit).toBe(2592000);
    });
    (0, globals_1.it)('should flag export denial', () => {
        const ir = compiler.compile([mockLicense]);
        (0, globals_1.expect)(ir.exportAllowed).toBe(false);
    });
    (0, globals_1.it)('should aggregate denied selectors', () => {
        const authWithDeny = {
            ...mockAuthority,
            id: 'Auth-Deny',
            selectors: [{ type: 'source', value: 'bad-source', allow: false }]
        };
        const ir = compiler.compile([authWithDeny]);
        (0, globals_1.expect)(ir.deniedSelectors).toContain('source:bad-source');
    });
});
