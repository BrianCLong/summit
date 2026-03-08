"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
(0, vitest_1.describe)('ThreatAnalyticsEngine', () => {
    (0, vitest_1.it)('synchronizes threat intel across MISP, STIX, and TAXII sources with deduplication', async () => {
        const misp = new index_1.MispClient(async () => [
            { id: 'm1', value: '10.0.0.1', type: 'ip', confidence: 90, source: 'MISP' },
        ]);
        const stix = new index_1.StixBundleAdapter(async () => ({
            objects: [
                {
                    id: 'indicator--1',
                    type: 'indicator',
                    pattern: "[ipv4-addr:value = '10.0.0.1']",
                    confidence: 80,
                },
            ],
        }));
        const taxii = new index_1.TaxiiCollectionClient('taxii-demo', async () => [
            {
                id: 't1',
                value: 'exfil.example.com',
                type: 'domain',
                confidence: 75,
                source: 'custom',
            },
        ]);
        const engine = new index_1.ThreatAnalyticsEngine();
        engine.registerIntelClient(misp);
        engine.registerIntelClient(stix);
        engine.registerIntelClient(taxii);
        const indicators = await engine.syncIntel();
        const ips = indicators.filter((indicator) => indicator.type === 'ip');
        const domains = indicators.filter((indicator) => indicator.type === 'domain');
        (0, vitest_1.expect)(indicators).toHaveLength(2);
        (0, vitest_1.expect)(ips[0]?.source).toBe('MISP');
        (0, vitest_1.expect)(domains[0]?.value).toBe('exfil.example.com');
    });
    (0, vitest_1.it)('filters low-confidence or expired intel and retains the strongest duplicate', async () => {
        const now = Date.now();
        const engine = new index_1.ThreatAnalyticsEngine({
            intel: { minConfidence: 40, now: () => now },
        });
        const stale = {
            id: 'low',
            value: 'malicious.example.com',
            type: 'domain',
            confidence: 10,
            source: 'custom',
            validUntil: new Date(now - 1_000).toISOString(),
        };
        const freshLowerConfidence = {
            id: 'mid',
            value: '10.1.1.5',
            type: 'ip',
            confidence: 60,
            source: 'custom',
        };
        const freshHigherConfidence = {
            id: 'high',
            value: '10.1.1.5',
            type: 'ip',
            confidence: 90,
            source: 'MISP',
            validUntil: new Date(now + 86_400_000).toISOString(),
        };
        engine.registerIntelClient(new index_1.MispClient(async () => [stale, freshLowerConfidence]));
        engine.registerIntelClient(new index_1.TaxiiCollectionClient('dup', async () => [freshHigherConfidence]));
        const indicators = await engine.syncIntel();
        (0, vitest_1.expect)(indicators).toHaveLength(1);
        (0, vitest_1.expect)(indicators[0]?.id).toBe('high');
        (0, vitest_1.expect)(indicators[0]?.value).toBe('10.1.1.5');
    });
    (0, vitest_1.it)('produces a high-severity alert by combining behavioral anomaly, pattern, correlation, and triage', async () => {
        const engine = new index_1.ThreatAnalyticsEngine({
            behavior: { minObservations: 3, zThreshold: 1.2 },
        });
        const misp = new index_1.MispClient(async () => [
            { id: 'm2', value: '10.0.0.2', type: 'ip', confidence: 95, source: 'MISP' },
        ]);
        engine.registerIntelClient(misp);
        await engine.syncIntel();
        const baseline = [500, 550, 530];
        const now = Date.now();
        for (let i = 0; i < baseline.length; i += 1) {
            engine.processEvent({
                entityId: 'svc-a',
                actor: 'svc-a',
                action: 'transfer.bytes',
                timestamp: now + i * 10,
                value: baseline[i],
                context: { ip: '192.168.1.1', sessionId: `s${i}` },
            });
        }
        const [alert] = engine.processEvent({
            entityId: 'svc-a',
            actor: 'svc-a',
            action: 'transfer.bytes',
            timestamp: now + 100,
            value: 75000,
            context: { ip: '10.0.0.2', sessionId: 'burst-session' },
            attributes: { uri: 'https://exfil.example.com/dump', host: 'exfil.example.com' },
        });
        (0, vitest_1.expect)(alert).toBeDefined();
        (0, vitest_1.expect)(alert?.severity === 'high' || alert?.severity === 'critical').toBe(true);
        (0, vitest_1.expect)(alert?.triage.actions.some((action) => action.type === 'isolate')).toBe(true);
        (0, vitest_1.expect)(alert?.patternMatches.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(alert?.indicators[0]?.value).toBe('10.0.0.2');
    });
    (0, vitest_1.it)('supports custom detection rules for alerting and tagging', () => {
        const ruleCondition = vitest_1.vi.fn((context) => context.event.action === 'auth.success' && context.event.context?.geo === 'sensitive-geo');
        const engine = new index_1.ThreatAnalyticsEngine({
            rules: [
                {
                    id: 'rule-geo',
                    description: 'logins from sensitive geography',
                    severity: 'high',
                    condition: ruleCondition,
                    tags: ['geo'],
                },
            ],
        });
        const [alert] = engine.processEvent({
            entityId: 'user-9',
            actor: 'user-9',
            action: 'auth.success',
            timestamp: Date.now(),
            context: { geo: 'sensitive-geo' },
        });
        (0, vitest_1.expect)(ruleCondition).toHaveBeenCalled();
        (0, vitest_1.expect)(alert).toBeDefined();
        (0, vitest_1.expect)(alert?.ruleIds).toContain('rule-geo');
        (0, vitest_1.expect)(alert?.triage.actions.some((action) => action.type === 'open-ticket')).toBe(true);
    });
});
