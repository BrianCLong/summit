"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
function buildEnvelope(overrides) {
    const base = {
        state: {
            subjectId: 'user-123',
            policyId: 'policy-analytics',
            status: 'granted',
            scopes: ['analytics'],
            jurisdiction: 'US',
            updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
            version: 1,
            lawfulBasis: 'consent',
            overrides: [],
            metadata: { source: 'unit-test' },
        },
        source: {
            domain: 'mc',
            service: 'consent-api',
            endpoint: 'v1',
            environment: 'prod',
            topologyPath: ['global', 'prod'],
        },
        policyBinding: {
            id: 'policy-analytics',
            version: '1.0.0',
            hash: 'abc123',
        },
        evidence: ['ledger://consent/user-123'],
    };
    return {
        ...base,
        ...overrides,
        state: { ...base.state, ...overrides.state },
        source: { ...base.source, ...(overrides.source ?? {}) },
    };
}
(0, vitest_1.describe)('ConsentStateReconciler', () => {
    (0, vitest_1.it)('resolves conflicts using strictest status ordering', async () => {
        const reconciler = new index_1.ConsentStateReconciler();
        await reconciler.ingest(buildEnvelope({}));
        const resolution = await reconciler.ingest(buildEnvelope({
            state: {
                status: 'denied',
                updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
                version: 2,
                overrides: ['gdpr-withdrawal'],
            },
            source: { service: 'consent-bridge' },
        }));
        (0, vitest_1.expect)(resolution.finalState.status).toBe('denied');
        (0, vitest_1.expect)(resolution.appliedOverrides).toContain('gdpr-withdrawal');
        const conflict = reconciler.getConflict('user-123', 'policy-analytics');
        (0, vitest_1.expect)(conflict).toBeTruthy();
        (0, vitest_1.expect)(conflict?.severity).toBe('error');
        (0, vitest_1.expect)(conflict?.candidates).toHaveLength(2);
        const audit = reconciler.getAuditLog();
        (0, vitest_1.expect)(audit.some((entry) => entry.action === 'conflict-generated')).toBe(true);
    });
    (0, vitest_1.it)('invokes integration modules and emits resolution events', async () => {
        const reconciler = new index_1.ConsentStateReconciler();
        const syncSpy = vitest_1.vi.fn();
        const module = {
            name: 'mc-adapter',
            supportedDomains: ['mc'],
            sync: syncSpy,
        };
        reconciler.registerModule(module);
        const listener = vitest_1.vi.fn();
        const unsubscribe = reconciler.subscribe(listener);
        await reconciler.ingest(buildEnvelope({
            state: {
                status: 'granted',
                updatedAt: new Date('2024-02-01T00:00:00Z').toISOString(),
                version: 3,
            },
        }));
        (0, vitest_1.expect)(syncSpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(listener.mock.calls[0][0].finalState.status).toBe('granted');
        unsubscribe();
    });
    (0, vitest_1.it)('runs validation scenarios against the reconciliation harness', async () => {
        const reconciler = new index_1.ConsentStateReconciler();
        const scenarios = [
            {
                id: 'conflict-strict-deny',
                description: 'Deny should override granted consent when conflicts exist',
                setup: [
                    buildEnvelope({}),
                    buildEnvelope({
                        state: {
                            status: 'denied',
                            updatedAt: new Date('2024-03-01T00:00:00Z').toISOString(),
                            version: 4,
                        },
                        source: { domain: 'intelgraph', service: 'policy-sync' },
                    }),
                ],
                expectation: {
                    subjectId: 'user-123',
                    policyId: 'policy-analytics',
                    expectedStatus: 'denied',
                    expectedConflicts: 1,
                },
            },
        ];
        const report = await reconciler.runValidation(scenarios);
        (0, vitest_1.expect)(report.scenarios).toHaveLength(1);
        (0, vitest_1.expect)(report.scenarios[0].scenarioId).toBe('conflict-strict-deny');
        (0, vitest_1.expect)(report.scenarios[0].passed).toBe(true);
        (0, vitest_1.expect)(report.scenarios[0].actualStatus).toBe('denied');
    });
    (0, vitest_1.it)('summarises reconciliation topology by source domains', async () => {
        const reconciler = new index_1.ConsentStateReconciler();
        await reconciler.ingest(buildEnvelope({
            state: {
                subjectId: 'user-1',
                updatedAt: new Date('2024-04-01T00:00:00Z').toISOString(),
                version: 1,
            },
        }));
        await reconciler.ingest(buildEnvelope({
            state: {
                subjectId: 'user-2',
                policyId: 'policy-marketing',
                status: 'revoked',
                scopes: ['marketing'],
                updatedAt: new Date('2024-04-02T00:00:00Z').toISOString(),
                version: 2,
            },
            source: {
                domain: 'intelgraph',
                service: 'graph-consent',
                topologyPath: ['global', 'edge'],
            },
        }));
        const snapshot = reconciler.getTopologySnapshot();
        (0, vitest_1.expect)(snapshot.nodes.length).toBe(2);
        const mcNode = snapshot.nodes.find((node) => node.domain === 'mc');
        (0, vitest_1.expect)(mcNode).toBeTruthy();
        (0, vitest_1.expect)(mcNode?.totalSubjects).toBe(1);
        (0, vitest_1.expect)(mcNode?.statuses.granted).toBe(1);
        const igNode = snapshot.nodes.find((node) => node.domain === 'intelgraph');
        (0, vitest_1.expect)(igNode).toBeTruthy();
        (0, vitest_1.expect)(igNode?.statuses.revoked).toBe(1);
    });
});
