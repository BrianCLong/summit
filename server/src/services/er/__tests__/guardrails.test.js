"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.unstable_mockModule('../../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn(),
    },
}));
const mockDlq = {
    enqueue: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../../../lib/dlq/index.js', () => ({
    dlqFactory: globals_1.jest.fn(() => mockDlq),
}));
(0, globals_1.describe)('EntityResolutionV2Service guardrails', () => {
    let EntityResolutionV2Service;
    let provenanceLedger;
    const originalEnv = { ...process.env };
    (0, globals_1.beforeAll)(async () => {
        ({ EntityResolutionV2Service } = await Promise.resolve().then(() => __importStar(require('../EntityResolutionV2Service.js'))));
        ({ provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../../../provenance/ledger.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        process.env = { ...originalEnv };
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.it)('computes guardrail metrics from fixtures', () => {
        process.env.ER_GUARDRAIL_MIN_PRECISION = '0.1';
        process.env.ER_GUARDRAIL_MIN_RECALL = '0.1';
        process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.6';
        process.env.ER_GUARDRAIL_DATASET_ID = 'baseline';
        const service = new EntityResolutionV2Service({ dlq: mockDlq });
        const result = service.evaluateGuardrails();
        (0, globals_1.expect)(result.datasetId).toBe('baseline');
        (0, globals_1.expect)(result.metrics.totalPairs).toBeGreaterThan(0);
        (0, globals_1.expect)(result.metrics.precision).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(result.metrics.recall).toBeGreaterThanOrEqual(0);
    });
    (0, globals_1.it)('blocks merges when guardrails fail without override', async () => {
        process.env.ER_GUARDRAIL_MIN_PRECISION = '0.99';
        process.env.ER_GUARDRAIL_MIN_RECALL = '0.99';
        process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.8';
        const service = new EntityResolutionV2Service({ dlq: mockDlq });
        const session = {
            run: globals_1.jest.fn().mockResolvedValue({
                records: [
                    {
                        get: () => ({
                            labels: ['Entity'],
                            properties: { id: 'm1', name: 'Alpha' },
                        }),
                    },
                    {
                        get: () => ({
                            labels: ['Entity'],
                            properties: { id: 'm2', name: 'Beta' },
                        }),
                    },
                ],
            }),
        };
        await (0, globals_1.expect)(service.merge(session, {
            masterId: 'm1',
            mergeIds: ['m2'],
            userContext: { userId: 'tester', tenantId: 'tenant-1' },
            rationale: 'test',
            guardrailDatasetId: 'low-recall',
        })).rejects.toThrow(/guardrails failed/i);
    });
    (0, globals_1.it)('logs override reason when guardrails fail but override is provided', async () => {
        process.env.ER_GUARDRAIL_MIN_PRECISION = '0.99';
        process.env.ER_GUARDRAIL_MIN_RECALL = '0.99';
        process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.8';
        const service = new EntityResolutionV2Service({ dlq: mockDlq });
        const tx = {
            run: globals_1.jest.fn(async (query) => {
                if (query.includes('MERGE (d:ERDecision {idempotencyKey')) {
                    return {
                        records: [
                            {
                                get: (key) => {
                                    if (key === 'decisionId')
                                        return 'dec-guardrail';
                                    if (key === 'mergeId')
                                        return 'merge-guardrail';
                                    if (key === 'masterId')
                                        return 'm1';
                                    if (key === 'mergeIds')
                                        return ['m2'];
                                    if (key === 'created')
                                        return false;
                                    return null;
                                },
                            },
                        ],
                    };
                }
                return { records: [] };
            }),
            commit: globals_1.jest.fn().mockResolvedValue(undefined),
            rollback: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        const session = {
            run: globals_1.jest.fn().mockResolvedValue({
                records: [
                    {
                        get: () => ({
                            labels: ['Entity'],
                            properties: { id: 'm1', name: 'Alpha' },
                        }),
                    },
                    {
                        get: () => ({
                            labels: ['Entity'],
                            properties: { id: 'm2', name: 'Beta' },
                        }),
                    },
                ],
            }),
            beginTransaction: globals_1.jest.fn().mockReturnValue(tx),
        };
        const result = await service.merge(session, {
            masterId: 'm1',
            mergeIds: ['m2'],
            mergeId: 'merge-guardrail',
            userContext: { userId: 'tester', tenantId: 'tenant-1' },
            rationale: 'override test',
            guardrailDatasetId: 'low-recall',
            guardrailOverrideReason: 'Approved by lead analyst.',
        });
        (0, globals_1.expect)(result.overrideUsed).toBe(true);
        (0, globals_1.expect)(provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'ER_GUARDRAIL_OVERRIDE',
            actorId: 'tester',
            payload: globals_1.expect.objectContaining({
                reason: 'Approved by lead analyst.',
            }),
        }));
    });
});
