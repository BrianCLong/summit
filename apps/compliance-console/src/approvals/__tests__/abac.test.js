"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const abac_1 = require("../abac");
const mockData_1 = require("../mockData");
(0, vitest_1.describe)('abacDecision', () => {
    const base = mockData_1.approvalsData[0];
    (0, vitest_1.it)('allows compliant approval', () => {
        const result = (0, abac_1.abacDecision)(mockData_1.demoUser, base, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
    (0, vitest_1.it)('denies when tenant mismatch', () => {
        const user = { ...mockData_1.demoUser, tenants: ['other'] };
        const result = (0, abac_1.abacDecision)(user, base, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toMatch(/tenant/i);
    });
    (0, vitest_1.it)('requires region match', () => {
        const user = { ...mockData_1.demoUser, region: 'eu' };
        const result = (0, abac_1.abacDecision)(user, base, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toMatch(/region/i);
    });
    (0, vitest_1.it)('requires clearance for restricted sensitivity', () => {
        const user = { ...mockData_1.demoUser, clearance: 'l2' };
        const result = (0, abac_1.abacDecision)(user, base, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toMatch(/restricted/i);
    });
    (0, vitest_1.it)('enforces dual control when compliance officer has not approved', () => {
        const user = { ...mockData_1.demoUser, role: 'auditor' };
        const result = (0, abac_1.abacDecision)(user, base, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toMatch(/compliance officer/i);
    });
    (0, vitest_1.it)('allows second approval once compliance officer approval exists', () => {
        const user = { ...mockData_1.demoUser, role: 'auditor' };
        const result = (0, abac_1.abacDecision)(user, {
            ...base,
            approvals: [
                ...base.approvals,
                {
                    id: 'act-x',
                    actor: 'user-9',
                    role: 'compliance_officer',
                    decision: 'approved',
                    rationale: 'Dual control satisfied',
                    timestamp: new Date().toISOString(),
                    correlationId: base.correlationId,
                },
            ],
        }, 'approve');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
});
