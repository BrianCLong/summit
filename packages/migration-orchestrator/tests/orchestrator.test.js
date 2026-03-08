"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_ts_1 = require("../src/index.ts");
const orchestrator = new index_ts_1.MigrationOrchestrator();
(0, node_test_1.describe)('MigrationOrchestrator', () => {
    (0, node_test_1.it)('deduplicates identities via domains and SCIM ids', () => {
        const first = orchestrator.identity.mapUser({
            userId: 'u1',
            orgId: 'o1',
            domains: ['example.com'],
            scimIds: ['scim-1'],
            provenance: ['seed'],
        });
        const merged = orchestrator.identity.mapUser({
            userId: 'u2',
            orgId: 'o1',
            domains: ['example.com', 'alt.com'],
            scimIds: ['scim-1'],
            provenance: ['scim'],
        });
        strict_1.default.equal(first.guid, merged.guid);
        strict_1.default.ok(merged.domains.includes('alt.com'));
        strict_1.default.equal(orchestrator.identity.getIdentity(first.guid)?.provenance.length, 2);
    });
    (0, node_test_1.it)('links tenants with audit and rollback checkpoints', () => {
        const link = orchestrator.accountLinks.link('legacy', 'new');
        orchestrator.accountLinks.checkpoint('legacy', 'new', 'preflight');
        orchestrator.accountLinks.rollback('legacy', 'new', 'parity breach');
        strict_1.default.ok(link.checkpoints.includes('preflight'));
        strict_1.default.equal(link.auditTrail.some((entry) => entry.includes('rollback')), true);
    });
    (0, node_test_1.it)('previews entitlements and detects billing mismatches', () => {
        orchestrator.entitlements.upsertTenantEntitlements({
            tenantId: 't1',
            plan: 'pro',
            entitlements: [
                { name: 'seats', limit: 10 },
                { name: 'storage', limit: 1000, grandfathered: true },
            ],
        });
        orchestrator.entitlements.addBillingSnapshot({
            tenantId: 't1',
            entitlements: [
                { name: 'seats', limit: 10 },
                { name: 'storage', limit: 800 },
            ],
        });
        const preview = orchestrator.entitlements.previewEntitlements('t1');
        strict_1.default.ok(preview.previewNotes);
        const reconciliation = orchestrator.entitlements.reconcileBilling('t1');
        strict_1.default.equal(reconciliation.ok, false);
        strict_1.default.ok(reconciliation.mismatches.includes('storage'));
    });
    (0, node_test_1.it)('runs backfill with checkpoints and DLQ on persistent failure', async () => {
        const framework = orchestrator.backfill(2, 2);
        let attempts = 0;
        const result = await framework.run([1, 2, 3], async (value) => {
            if (value === 2 && attempts < 2) {
                attempts += 1;
                throw new Error('transient');
            }
        }, (index, value) => value === 3 || index === 0);
        strict_1.default.deepEqual(result.checkpoints, [0, 2]);
        strict_1.default.equal(result.processed, 3);
        strict_1.default.equal(result.failed, 0);
        strict_1.default.equal(result.dlq.length, 0);
    });
    (0, node_test_1.it)('produces parity report with sample drift detection', () => {
        const report = orchestrator.parityEngine.computeParity('users', [
            { id: '1', payload: { name: 'Alice', active: true } },
            { id: '2', payload: { name: 'Bob', active: false } },
        ], [
            { id: '1', payload: { name: 'Alice', active: true } },
            { id: '2', payload: { name: 'Bob', active: true } },
        ], [
            (legacy, target) => ({
                name: 'active parity',
                passed: legacy.active === target.active,
            }),
        ]);
        strict_1.default.equal(report.countsMatch, true);
        strict_1.default.ok(report.sampleDrift[0]);
        strict_1.default.ok(report.invariantPassRate < 1);
    });
    (0, node_test_1.it)('signs, verifies, and replays integration events', () => {
        orchestrator.integrations.inventory('t1', [
            { id: 'hook', type: 'webhook', critical: true, endpoints: ['https://legacy'], health: 'degraded' },
        ]);
        orchestrator.integrations.dualPublish('t1', { id: 'evt-1', payload: { hello: 'world' } });
        orchestrator.integrations.dualPublish('t1', { id: 'evt-2', payload: { hello: 'again' } });
        const signature = orchestrator.integrations.signWebhook('body', 'secret');
        strict_1.default.equal(orchestrator.integrations.verifyWebhook('body', 'secret', signature), true);
        strict_1.default.equal(orchestrator.integrations.replayMissed('t1', 'evt-1').length, 1);
        strict_1.default.equal(orchestrator.integrations.healthSummary('t1').hook, 'degraded');
    });
    (0, node_test_1.it)('assembles dashboard snapshots with rollback signal and actions', () => {
        orchestrator.lifecycle.setPhase('t1', 'ramp');
        orchestrator.ux.setWorkflows('t1', [
            { workflow: 'search', status: 'matched' },
            { workflow: 'export', status: 'compat-mode', compatToggleExpiresAt: new Date() },
        ]);
        orchestrator.support.addTicket('t1', { id: 'sup-1', severity: 'high' });
        orchestrator.reliability.recordSyntheticCheck({ name: 'search', latencyMs: 200, errorRate: 0.02, passed: false });
        orchestrator.reliability.recordDrift(0.05);
        const builder = orchestrator.dashboardBuilder();
        const snapshot = builder.buildSnapshot('t1', [
            {
                entity: 'users',
                legacy: [{ id: '1', payload: { active: true } }],
                target: [{ id: '1', payload: { active: true } }],
                invariants: [
                    (legacy, target) => ({
                        name: 'active parity',
                        passed: legacy.active === target.active,
                    }),
                ],
            },
        ]);
        strict_1.default.equal(snapshot.rollbackReady, true);
        strict_1.default.ok(snapshot.nextActions[0].action.includes('ramp'));
        strict_1.default.equal(snapshot.supportTickets[0].severity, 'high');
    });
});
