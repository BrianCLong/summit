"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const now = new Date().toISOString();
(0, vitest_1.describe)('SchemaRegistry', () => {
    (0, vitest_1.it)('validates canonical entities against registered schemas', () => {
        const registry = new index_js_1.SchemaRegistry();
        registry.register({
            name: 'user',
            version: '1.0.0',
            schema: {
                type: 'object',
                properties: { id: { type: 'string' }, email: { type: 'string' } },
                required: ['id', 'email'],
            },
        });
        (0, vitest_1.expect)(registry.validate('user', { id: 'u1', email: 'a@example.com' }).valid).toBe(true);
        const result = registry.validate('user', { id: 'u1' });
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors[0]).toContain('email');
    });
});
(0, vitest_1.describe)('IntentTelemetry', () => {
    (0, vitest_1.it)('captures user intent events and broadcasts on the bus', async () => {
        const bus = new index_js_1.InMemoryEventBus();
        const telemetry = new index_js_1.IntentTelemetry(bus);
        const handler = vitest_1.vi.fn();
        telemetry.subscribe('request', handler);
        telemetry.log({
            id: 'evt-1',
            intent: 'request',
            actor: 'alice',
            surface: 'ui',
            targetEntity: 'ticket',
            targetId: 't-1',
            tenantId: 'tenant-1',
            occurredAt: now,
        });
        (0, vitest_1.expect)(telemetry.getRecorded()).toHaveLength(1);
        (0, vitest_1.expect)(handler).toHaveBeenCalledTimes(1);
    });
});
(0, vitest_1.describe)('DataQualityGate', () => {
    (0, vitest_1.it)('flags stale, null, and duplicate records', () => {
        const alerts = [];
        const gate = new index_js_1.DataQualityGate({
            sendAlert: (alert) => alerts.push(`${alert.reason}:${alert.records.length}`),
        });
        const records = [
            { id: '1', updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), email: 'a@example.com' },
            { id: '2', updatedAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(), email: null },
            { id: '2', updatedAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(), email: 'b@example.com' },
        ];
        const report = gate.evaluate('users', records, {
            freshnessMinutes: 60,
            requiredFields: ['email'],
            dedupeKey: 'id',
        });
        (0, vitest_1.expect)(report.freshnessViolation).toBeDefined();
        (0, vitest_1.expect)(report.nullViolations).toHaveLength(1);
        (0, vitest_1.expect)(report.duplicateViolations).toHaveLength(1);
        (0, vitest_1.expect)(report.quarantined).toHaveLength(3);
        (0, vitest_1.expect)(alerts.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('RetrievalIndex', () => {
    (0, vitest_1.it)('detects documents that need refresh based on interval', () => {
        const index = new index_js_1.RetrievalIndex();
        index.add({
            id: 'doc-1',
            title: 'Runbook',
            owner: 'sre',
            tags: ['operations'],
            refreshIntervalMinutes: 30,
            lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
            link: 'https://example.com',
        });
        const due = index.dueForRefresh();
        (0, vitest_1.expect)(due).toHaveLength(1);
    });
});
(0, vitest_1.describe)('FeatureStore', () => {
    (0, vitest_1.it)('stores features with TTL and supports idempotent backfill', async () => {
        const store = new index_js_1.FeatureStore();
        const createdAt = new Date(Date.now() - 1000 * 60 * 59).toISOString();
        store.upsert({
            key: 'feat-1',
            value: { score: 0.9 },
            lineage: ['dataset-1'],
            ttlMinutes: 60,
            createdAt,
            version: '1.0.0',
            sourceArtifacts: ['artifact-1'],
        });
        const result = store.get('feat-1');
        (0, vitest_1.expect)(result?.lineage).toContain('dataset-1');
        const jobResults = await store.backfill({
            id: 'job-1',
            inputs: [{ id: '2' }],
            compute: async (input) => ({
                key: `feat-${input.id}`,
                value: { score: 0.7 },
                lineage: ['dataset-2'],
                ttlMinutes: 30,
                createdAt: now,
                version: '1.0.1',
                sourceArtifacts: ['artifact-2'],
            }),
        });
        (0, vitest_1.expect)(jobResults).toHaveLength(1);
        (0, vitest_1.expect)(store.get('feat-2')?.version).toBe('1.0.1');
    });
});
(0, vitest_1.describe)('PII guard', () => {
    (0, vitest_1.it)('redacts and hashes configured paths', () => {
        const guard = new index_js_1.PiiGuard([
            { path: 'email', action: 'redact' },
            { path: 'ssn', action: 'hash' },
            { path: 'address.line1', action: 'drop' },
        ]);
        const redacted = guard.redact({
            email: 'a@example.com',
            ssn: '123-45-6789',
            address: { line1: '123 Main', city: 'NYC' },
        });
        (0, vitest_1.expect)(redacted.email).toBe('[REDACTED]');
        (0, vitest_1.expect)(redacted.ssn).not.toBe('123-45-6789');
        (0, vitest_1.expect)(redacted.address.line1).toBeUndefined();
    });
});
(0, vitest_1.describe)('ProvenanceTracker', () => {
    (0, vitest_1.it)('links AI outputs to artifacts and captures feedback', () => {
        const tracker = new index_js_1.ProvenanceTracker();
        tracker.record({
            outputId: 'out-1',
            artifactIds: ['doc-1'],
            sourceInputs: { prompt: 'hello' },
            createdAt: now,
            citations: ['doc-1'],
        });
        tracker.attachFeedback('out-1', {
            outputId: 'out-1',
            actor: 'alice',
            helpful: false,
            reason: 'Incorrect steps',
            recordedAt: now,
        });
        (0, vitest_1.expect)(tracker.get('out-1')?.feedback?.reason).toBe('Incorrect steps');
    });
});
(0, vitest_1.describe)('ModelRegistry', () => {
    (0, vitest_1.it)('tracks versions and rollbacks with release linkage', () => {
        const models = new index_js_1.ModelRegistry();
        models.register({ modelId: 'copilot', version: '1.0.0', release: '2024.10', metrics: { precision: 0.92 } });
        models.register({ modelId: 'copilot', version: '1.1.0', release: '2024.11', metrics: { precision: 0.94 } });
        (0, vitest_1.expect)(models.latest('copilot')?.version).toBe('1.1.0');
        models.rollback('copilot', '1.1.0', 'regression detected');
        (0, vitest_1.expect)(models.latest('copilot')?.rolledBack).toBe(true);
    });
});
(0, vitest_1.describe)('AIReadinessControlPlane', () => {
    let plane;
    let alerts;
    (0, vitest_1.beforeEach)(() => {
        alerts = [];
        plane = new index_js_1.AIReadinessControlPlane({
            piiRules: [
                { path: 'email', action: 'redact' },
                { path: 'creditCard.number', action: 'drop' },
            ],
            alertSink: {
                sendAlert: (alert) => alerts.push(`${alert.table}:${alert.reason}`),
            },
        }, new index_js_1.InMemoryEventBus());
        plane.registerSchema({
            name: 'ticket',
            version: '1.0.0',
            schema: {
                type: 'object',
                properties: { id: { type: 'string' }, summary: { type: 'string' } },
                required: ['id', 'summary'],
            },
        });
    });
    (0, vitest_1.it)('validates, redacts, and logs provenance end-to-end', async () => {
        const { validated, redacted, piiTags } = plane.validateAndSanitize('ticket', {
            id: 't-1',
            summary: 'Help',
            email: 'sensitive@example.com',
            creditCard: { number: '4111111111111111' },
        });
        (0, vitest_1.expect)(validated).toBe(true);
        (0, vitest_1.expect)(redacted.email).toBe('[REDACTED]');
        (0, vitest_1.expect)(redacted.creditCard.number).toBeUndefined();
        (0, vitest_1.expect)(piiTags).toContain('email');
        plane.logIntent({
            id: 'evt-2',
            intent: 'approve',
            actor: 'moderator',
            surface: 'ui',
            targetEntity: 'ticket',
            targetId: 't-1',
            tenantId: 'tenant-1',
            occurredAt: now,
        });
        const quality = plane.enforceDataQuality('tickets', [
            { id: 't-1', updatedAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(), summary: 'Help' },
            { id: 't-1', updatedAt: now, summary: 'Help' },
        ], { freshnessMinutes: 60, dedupeKey: 'id', requiredFields: ['summary'] });
        (0, vitest_1.expect)(quality.duplicateViolations).toHaveLength(1);
        (0, vitest_1.expect)(alerts).not.toHaveLength(0);
        plane.indexDocument({
            id: 'doc-1',
            title: 'Runbook',
            owner: 'sre',
            tags: ['operations'],
            refreshIntervalMinutes: 1,
            link: 'https://example.com',
        });
        (0, vitest_1.expect)(plane.documentsNeedingRefresh(now)).toHaveLength(1);
        await plane.scheduleBackfill({
            id: 'bf-1',
            inputs: [{ id: 't-1' }],
            allowOverwrite: true,
            compute: async (input) => ({
                key: `feature-${input.id}`,
                value: { urgency: 'high' },
                lineage: ['ticket'],
                ttlMinutes: 30,
                createdAt: now,
                version: '1.0.0',
                sourceArtifacts: ['doc-1'],
            }),
        });
        (0, vitest_1.expect)(plane.fetchFeature('feature-t-1')?.version).toBe('1.0.0');
        plane.trackProvenance({
            outputId: 'out-2',
            artifactIds: ['doc-1'],
            sourceInputs: { ticketId: 't-1' },
            createdAt: now,
            citations: ['doc-1'],
        });
        plane.attachFeedback('out-2', {
            outputId: 'out-2',
            actor: 'agent',
            helpful: true,
            recordedAt: now,
        });
        plane.recordModel({ modelId: 'assist', version: '1.0.0', release: '2024.12', metrics: { precision: 0.93 } });
        const policyDecision = plane.evaluatePolicy({
            profile: 'defense_restricted',
            intent: 'decision_support',
            actorType: 'gov_operator',
            modelTier: 'frontier',
            context: (0, index_js_1.createDefaultPolicyContext)('req-3', 'tenant-1'),
        });
        (0, vitest_1.expect)(policyDecision.allowed).toBe(true);
        (0, vitest_1.expect)(plane.listPolicyAudits().length).toBeGreaterThan(0);
        const snapshot = plane.snapshot();
        (0, vitest_1.expect)(snapshot.models).toHaveLength(1);
        (0, vitest_1.expect)(snapshot.pendingFeatures.length).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(snapshot.provenance[0].feedback?.helpful).toBe(true);
    });
});
(0, vitest_1.describe)('PolicyEngine', () => {
    (0, vitest_1.it)('enforces immutable red lines and deny-by-default semantics', () => {
        const engine = new index_js_1.PolicyEngine(index_js_1.defaultPolicyProfiles);
        const denied = engine.evaluate({
            profile: 'civilian_safe',
            intent: 'autonomous_targeting',
            actorType: 'gov_operator',
            modelTier: 'frontier',
            context: (0, index_js_1.createDefaultPolicyContext)('req-1', 'tenant-1'),
        });
        (0, vitest_1.expect)(denied.allowed).toBe(false);
        (0, vitest_1.expect)(denied.reason).toContain('Immutable red line');
        const fallbackDenied = engine.evaluate({
            profile: 'defense_restricted',
            intent: 'research',
            actorType: 'researcher',
            modelTier: 'baseline',
            context: (0, index_js_1.createDefaultPolicyContext)('req-2', 'tenant-1'),
        });
        (0, vitest_1.expect)(fallbackDenied.allowed).toBe(false);
        (0, vitest_1.expect)(fallbackDenied.reason).toContain('Deny-by-default');
    });
    (0, vitest_1.it)('rejects profile updates that attempt to remove immutable red lines', () => {
        const engine = new index_js_1.PolicyEngine(index_js_1.defaultPolicyProfiles);
        (0, vitest_1.expect)(() => engine.updateProfile('civilian_safe', (profile) => ({
            ...profile,
            rules: profile.rules.filter((rule) => rule.id !== 'ban_autonomous_targeting'),
        }))).toThrowError('Immutable red line cannot be removed or changed: ban_autonomous_targeting');
    });
});
