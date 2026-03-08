"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const baseSpec = {
    taskId: 'task-123',
    tenantId: 'tenant-1',
    title: 'Sample',
    goal: 'Ship feature',
    nonGoals: [],
    inputs: [],
    constraints: {
        latencyP95Ms: 500,
        budgetUSD: 2,
        contextTokensMax: 16000,
    },
    policy: {
        purpose: 'engineering',
        retention: 'standard-365d',
        licenseClass: 'MIT-OK',
        pii: false,
    },
    acceptanceCriteria: [
        {
            id: 'AC-1',
            statement: 'All tests pass',
            verify: 'test',
            metric: 'pass-rate',
            threshold: '1.0',
        },
    ],
    risks: [],
    raci: {
        owner: 'owner@example.com',
        reviewers: ['reviewer@example.com'],
    },
    sla: {
        due: '2030-01-01T00:00:00Z',
    },
    policyTags: ['purpose:engineering', 'retention:standard-365d', 'pii:absent'],
    language: 'en',
};
(0, vitest_1.describe)('validateTaskSpec', () => {
    (0, vitest_1.it)('marks valid specs as valid and warns about optional hints', () => {
        const res = (0, index_js_1.validateTaskSpec)(baseSpec);
        (0, vitest_1.expect)(res.valid).toBe(true);
        (0, vitest_1.expect)(res.errors).toEqual([]);
        (0, vitest_1.expect)(res.warnings).toEqual([]);
    });
    (0, vitest_1.it)('detects missing acceptance criteria and invalid budgets', () => {
        const spec = {
            ...baseSpec,
            constraints: {
                latencyP95Ms: 0,
                budgetUSD: -1,
                contextTokensMax: 0,
            },
            acceptanceCriteria: [],
        };
        const res = (0, index_js_1.validateTaskSpec)(spec);
        (0, vitest_1.expect)(res.valid).toBe(false);
        (0, vitest_1.expect)(res.errors).toEqual([
            'at least one acceptance criteria is required',
            'budget must be positive',
            'latencyP95Ms must be positive',
            'contextTokensMax must be positive',
        ]);
    });
    (0, vitest_1.it)('warns when pii policy tag is missing', () => {
        const spec = {
            ...baseSpec,
            policy: {
                ...baseSpec.policy,
                pii: true,
            },
            policyTags: ['purpose:engineering', 'retention:standard-365d'],
        };
        const res = (0, index_js_1.validateTaskSpec)(spec);
        (0, vitest_1.expect)(res.valid).toBe(true);
        (0, vitest_1.expect)(res.warnings).toContain('PII flagged but policy tag missing');
    });
    (0, vitest_1.it)('detects duplicate acceptance criteria ids', () => {
        const ac = baseSpec.acceptanceCriteria[0];
        const spec = {
            ...baseSpec,
            acceptanceCriteria: [ac, { ...ac }],
        };
        const res = (0, index_js_1.validateTaskSpec)(spec);
        (0, vitest_1.expect)(res.valid).toBe(false);
        (0, vitest_1.expect)(res.errors).toContain('acceptance criteria ids must be unique');
    });
});
