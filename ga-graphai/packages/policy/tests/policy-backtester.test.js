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
const vitest_1 = require("vitest");
const index_ts_1 = require("../src/index.ts");
const allowAnalystReadV1 = {
    id: 'allow-analyst-read',
    description: 'Allow analysts to read analytics data',
    effect: 'allow',
    actions: ['report:read'],
    resources: ['analytics'],
    conditions: [
        { attribute: 'roles', operator: 'includes', value: ['analyst'] },
    ],
    obligations: [{ type: 'record-provenance' }],
};
const allowAnalystReadV11 = {
    ...allowAnalystReadV1,
    conditions: [
        { attribute: 'roles', operator: 'includes', value: ['analyst'] },
        { attribute: 'region', operator: 'eq', value: 'us-east-1' },
    ],
};
const denyContractorRule = {
    id: 'deny-contractors',
    description: 'Block contractor access after hardening',
    effect: 'deny',
    actions: ['report:read'],
    resources: ['analytics'],
    conditions: [
        { attribute: 'roles', operator: 'includes', value: ['contractor'] },
    ],
};
const history = [
    {
        policyId: 'governance',
        snapshots: [
            {
                policyId: 'governance',
                version: '1.0.0',
                capturedAt: '2024-01-01T00:00:00Z',
                rules: [allowAnalystReadV1],
                metadata: { label: 'initial rollout' },
            },
            {
                policyId: 'governance',
                version: '1.1.0',
                capturedAt: '2024-02-01T00:00:00Z',
                rules: [allowAnalystReadV11],
                metadata: { label: 'regional guardrail' },
            },
            {
                policyId: 'governance',
                version: '2.0.0',
                capturedAt: '2024-03-01T00:00:00Z',
                rules: [allowAnalystReadV11, denyContractorRule],
                metadata: { label: 'contractor restriction' },
            },
        ],
    },
];
(0, vitest_1.describe)('PolicyBacktestEngine', () => {
    const engine = new index_ts_1.PolicyBacktestEngine(history);
    (0, vitest_1.it)('supports temporal snapshot queries and retrieval', () => {
        const febSnapshot = engine.getSnapshotAt('governance', '2024-02-15T12:00:00Z');
        (0, vitest_1.expect)(febSnapshot?.version).toBe('1.1.0');
        const marchRange = engine.querySnapshots('governance', {
            from: '2024-02-01T00:00:00Z',
            to: '2024-03-31T23:59:59Z',
        });
        (0, vitest_1.expect)(marchRange).toHaveLength(2);
        (0, vitest_1.expect)(marchRange.map((snapshot) => snapshot.version)).toContain('2.0.0');
    });
    (0, vitest_1.it)('identifies policy version drift', () => {
        const diff = engine.compareVersions('governance', '1.0.0', '1.1.0');
        (0, vitest_1.expect)(diff.addedRules).toHaveLength(0);
        (0, vitest_1.expect)(diff.removedRules).toHaveLength(0);
        (0, vitest_1.expect)(diff.changedRules).toHaveLength(1);
        (0, vitest_1.expect)(diff.changedRules[0].ruleId).toBe('allow-analyst-read');
    });
    (0, vitest_1.it)('performs retroactive compliance checks with impact analysis and audit trail', () => {
        const events = [
            {
                id: 'evt-1',
                occurredAt: '2024-01-15T12:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-1',
                        roles: ['analyst'],
                        region: 'us-east-1',
                    },
                },
                expectedEffect: 'allow',
            },
            {
                id: 'evt-2',
                occurredAt: '2024-02-15T12:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-2',
                        roles: ['analyst'],
                        region: 'eu-west-1',
                    },
                },
                expectedEffect: 'allow',
                metadata: { source: 'historical-approval' },
            },
            {
                id: 'evt-3',
                occurredAt: '2024-03-20T12:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-3',
                        roles: ['analyst', 'contractor'],
                        region: 'us-east-1',
                    },
                },
                expectedEffect: 'deny',
            },
        ];
        const report = engine.retroactiveComplianceCheck('governance', events);
        (0, vitest_1.expect)(report.evaluatedEvents).toBe(3);
        (0, vitest_1.expect)(report.compliantEvents).toHaveLength(2);
        (0, vitest_1.expect)(report.nonCompliantEvents).toHaveLength(1);
        (0, vitest_1.expect)(report.nonCompliantEvents[0].event.id).toBe('evt-2');
        (0, vitest_1.expect)(report.impact.totalEvaluations).toBe(3);
        (0, vitest_1.expect)(report.impact.effectCounts.allow).toBe(1);
        (0, vitest_1.expect)(report.impact.effectCounts.deny).toBe(2);
        (0, vitest_1.expect)(report.impact.versionBreakdown['1.0.0'].allows).toBe(1);
        (0, vitest_1.expect)(report.impact.versionBreakdown['1.1.0'].denies).toBe(1);
        (0, vitest_1.expect)(report.impact.ruleHits['deny-contractors']).toBe(1);
        (0, vitest_1.expect)(report.impact.obligationCounts['record-provenance']).toBe(1);
        const auditTrail = engine.getAuditTrail({
            policyId: 'governance',
            simulationType: 'retroactive',
        });
        (0, vitest_1.expect)(auditTrail).toHaveLength(3);
        (0, vitest_1.expect)(auditTrail.some((entry) => entry.eventId === 'evt-2' && entry.compliant === false)).toBe(true);
    });
    (0, vitest_1.it)('simulates rollbacks and highlights divergences', () => {
        const rollbackEvents = [
            {
                id: 'rollback-1',
                occurredAt: '2024-03-10T12:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-4',
                        roles: ['analyst', 'contractor'],
                        region: 'us-east-1',
                    },
                },
            },
            {
                id: 'rollback-2',
                occurredAt: '2024-03-18T12:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-5',
                        roles: ['analyst'],
                        region: 'us-east-1',
                    },
                },
            },
        ];
        const rollback = engine.simulateRollback('governance', '1.0.0', rollbackEvents);
        (0, vitest_1.expect)(rollback.targetVersion).toBe('1.0.0');
        (0, vitest_1.expect)(rollback.baselineVersions).toContain('2.0.0');
        (0, vitest_1.expect)(rollback.evaluatedEvents).toBe(2);
        (0, vitest_1.expect)(rollback.divergingEvents).toHaveLength(1);
        (0, vitest_1.expect)(rollback.divergingEvents[0].event.id).toBe('rollback-1');
        (0, vitest_1.expect)(rollback.impact.effectCounts.allow).toBe(2);
        const auditTrail = engine.getAuditTrail({ simulationType: 'rollback' });
        (0, vitest_1.expect)(auditTrail).toHaveLength(2);
    });
    (0, vitest_1.it)('can skip events without snapshots when configured', () => {
        const skipEngine = new index_ts_1.PolicyBacktestEngine(history, {
            missingSnapshotStrategy: 'skip',
        });
        const skipReport = skipEngine.retroactiveComplianceCheck('governance', [
            {
                id: 'pre-history',
                occurredAt: '2023-12-20T00:00:00Z',
                request: {
                    action: 'report:read',
                    resource: 'analytics',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-6',
                        roles: ['analyst'],
                        region: 'us-east-1',
                    },
                },
            },
        ]);
        (0, vitest_1.expect)(skipReport.evaluatedEvents).toBe(0);
        (0, vitest_1.expect)(skipReport.skippedEvents).toHaveLength(1);
    });
});
if (process?.env?.NODE_TEST) {
    const { test: nodeTest } = await Promise.resolve().then(() => __importStar(require('node:test')));
    nodeTest('policy-backtester vitest compatibility placeholder', () => { });
}
