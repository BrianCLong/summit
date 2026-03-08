"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
function buildSimpleEvent(ledger, id, actor, action, resource, severity, system, correlationIds, timestamp) {
    ledger.append({
        id,
        category: 'security',
        actor,
        action,
        resource,
        payload: {
            severity,
            system,
            correlationIds,
        },
        timestamp,
    });
}
(0, vitest_1.describe)('AuditInvestigationPlatform', () => {
    let simpleLedger;
    let cursorLedger;
    let platform;
    let analystContext;
    let viewerContext;
    (0, vitest_1.beforeEach)(async () => {
        simpleLedger = new index_1.SimpleProvenanceLedger();
        buildSimpleEvent(simpleLedger, 'evt-1', 'alice', 'viewed-report', 'audit-dashboard', 'high', 'maestro-core', ['case-1'], '2024-04-01T00:00:00.000Z');
        buildSimpleEvent(simpleLedger, 'evt-2', 'alice', 'exported-data', 'sensitive-table', 'high', 'maestro-core', ['case-1'], '2024-04-01T00:05:00.000Z');
        buildSimpleEvent(simpleLedger, 'evt-3', 'alice', 'emailed-file', 'finance.xlsx', 'medium', 'maestro-core', ['case-1'], '2024-04-01T00:06:00.000Z');
        buildSimpleEvent(simpleLedger, 'evt-4', 'bob', 'viewed-report', 'ops-dashboard', 'medium', 'maestro-analytics', ['case-2'], '2024-04-01T00:07:00.000Z');
        cursorLedger = new index_1.ProvenanceLedger({
            now: () => new Date('2024-04-01T02:00:00.000Z'),
        });
        await cursorLedger.append({
            tenantId: 't1',
            repo: 'service-a',
            branch: 'main',
            event: 'cursor.commit',
            actor: { id: 'svc-1', displayName: 'Service Bot' },
            ts: '2024-04-01T01:00:00.000Z',
            purpose: 'investigation',
            provenance: { sessionId: 'case-1', requestId: 'req-1' },
        }, {
            decision: {
                decision: 'allow',
                explanations: ['baseline routing'],
                timestamp: '2024-04-01T01:00:00.000Z',
            },
        });
        await cursorLedger.append({
            tenantId: 't1',
            repo: 'service-a',
            branch: 'main',
            event: 'cursor.commit',
            actor: { id: 'svc-1', displayName: 'Service Bot' },
            ts: '2024-04-01T01:10:00.000Z',
            purpose: 'investigation',
            provenance: {
                sessionId: 'case-1',
                requestId: 'req-2',
                parentRequestId: 'req-1',
            },
        }, {
            decision: {
                decision: 'deny',
                explanations: ['policy violation'],
                timestamp: '2024-04-01T01:10:00.000Z',
            },
        });
        platform = new index_1.AuditInvestigationPlatform([
            (0, index_1.simpleLedgerDataSource)('maestro-core', simpleLedger),
            (0, index_1.cursorLedgerDataSource)('cursor', cursorLedger),
        ], {
            cacheTtlMs: 60_000,
            anomalyMultiplier: 1.2,
            anomalyMinEvents: 3,
            now: () => new Date('2024-04-02T00:00:00.000Z'),
        });
        analystContext = {
            tenantId: 't1',
            userId: 'analyst-1',
            sessionId: 'session-1',
            roles: ['analyst'],
        };
        viewerContext = {
            tenantId: 't1',
            userId: 'viewer-1',
            sessionId: 'session-2',
            roles: ['viewer'],
        };
    });
    (0, vitest_1.it)('supports natural language driven investigations across ledgers', async () => {
        const result = await platform.runNaturalLanguageQuery('correlation:case-1 severity:high last 48 hours', analystContext, { exportFormat: 'csv' });
        (0, vitest_1.expect)(result.cached).toBe(false);
        (0, vitest_1.expect)(result.events).toHaveLength(3);
        (0, vitest_1.expect)(result.timeline).toHaveLength(3);
        (0, vitest_1.expect)(result.correlations[0]?.systems).toContain('maestro-core');
        (0, vitest_1.expect)(result.correlations[0]?.systems).toContain('cursor');
        (0, vitest_1.expect)(result.exportPayload).toBeTruthy();
        (0, vitest_1.expect)(result.exportFormat).toBe('csv');
        (0, vitest_1.expect)(result.optimizedPlan).toBeDefined();
        (0, vitest_1.expect)(platform.getInvestigationTrail()).toHaveLength(1);
    });
    (0, vitest_1.it)('caches repeated structured queries', async () => {
        const filter = { actors: ['alice'] };
        const first = await platform.runQuery(filter, analystContext, {
            includeTimeline: true,
        });
        const second = await platform.runQuery(filter, analystContext, {
            includeTimeline: true,
        });
        (0, vitest_1.expect)(first.cached).toBe(false);
        (0, vitest_1.expect)(second.cached).toBe(true);
        (0, vitest_1.expect)(platform.getInvestigationTrail()).toHaveLength(2);
    });
    (0, vitest_1.it)('enforces role based export permissions', async () => {
        await (0, vitest_1.expect)(platform.runQuery({ systems: ['maestro-core'] }, viewerContext, {
            exportFormat: 'json',
        })).rejects.toThrow('Not authorized');
    });
    (0, vitest_1.it)('detects anomalies only for authorized roles', async () => {
        const analystResult = await platform.runQuery({ actors: ['alice'] }, analystContext, { includeAnomalies: true });
        (0, vitest_1.expect)(analystResult.anomalies.length).toBeGreaterThan(0);
        const viewerResult = await platform.runQuery({ actors: ['alice'] }, viewerContext, { includeAnomalies: true });
        (0, vitest_1.expect)(viewerResult.anomalies).toHaveLength(0);
    });
});
