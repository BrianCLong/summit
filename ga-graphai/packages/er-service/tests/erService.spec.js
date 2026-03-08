"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const fixture = JSON.parse((0, node_fs_1.readFileSync)(new URL('./fixtures/golden.json', import.meta.url), 'utf8'));
(0, vitest_1.describe)('EntityResolutionService', () => {
    (0, vitest_1.it)('returns reproducible candidate ordering on golden dataset', () => {
        const service = new index_js_1.EntityResolutionService(() => new Date('2024-01-01T00:00:00Z'));
        const entity = fixture.entities[0];
        const population = fixture.entities;
        const { candidates } = service.candidates({
            tenantId: fixture.tenantId,
            entity,
            population,
            topK: 3,
        });
        (0, vitest_1.expect)(candidates[0].entityId).toBe('p-2');
        (0, vitest_1.expect)(candidates[0].score).toBeGreaterThan(0.8);
        (0, vitest_1.expect)(candidates[0].decision).toBeDefined();
    });
    (0, vitest_1.it)('merges duplicates and supports explain + revert', () => {
        const service = new index_js_1.EntityResolutionService(() => new Date('2024-02-02T10:00:00Z'));
        const { candidates } = service.candidates({
            tenantId: fixture.tenantId,
            entity: fixture.entities[0],
            population: fixture.entities,
        });
        const top = candidates[0];
        const merge = service.merge({
            tenantId: fixture.tenantId,
            primaryId: 'p-1',
            duplicateId: top.entityId,
            actor: 'analyst@example.com',
            reason: 'Duplicate person record',
            policyTags: ['er:manual-review'],
            model: { id: 'rules-v1', version: '1.0.0', hash: 'rules-only' },
        }, top);
        (0, vitest_1.expect)(merge.reversible).toBe(true);
        (0, vitest_1.expect)(merge.modelHash).toBe('rules-only');
        const explanation = service.explain(merge.mergeId);
        (0, vitest_1.expect)(explanation.features.nameSimilarity).toBeGreaterThan(0.7);
        (0, vitest_1.expect)(explanation.policyTags).toContain('er:manual-review');
        (0, vitest_1.expect)(explanation.modelHash).toBe('rules-only');
        service.revertMerge(merge.mergeId, 'lead@example.com', 'Confirmed false positive');
        (0, vitest_1.expect)(service.getMerge(merge.mergeId)).toBeUndefined();
        const audit = service.getAuditLog();
        const events = audit.filter((entry) => entry.target === merge.mergeId);
        (0, vitest_1.expect)(events).toHaveLength(2);
        (0, vitest_1.expect)(events[1].event).toBe('revert');
    });
    (0, vitest_1.it)('emits structured observability for entity extraction workflows', () => {
        const logger = { info: vitest_1.vi.fn(), warn: vitest_1.vi.fn(), error: vitest_1.vi.fn() };
        const metrics = { observe: vitest_1.vi.fn(), increment: vitest_1.vi.fn() };
        const spans = [];
        const tracer = {
            startSpan: vitest_1.vi.fn((name) => {
                const end = vitest_1.vi.fn();
                const span = { name, end, recordException: vitest_1.vi.fn() };
                spans.push({ name, end });
                return span;
            }),
        };
        const service = new index_js_1.EntityResolutionService(() => new Date('2024-03-03T00:00:00Z'), { logger, metrics, tracer });
        const { candidates } = service.candidates({
            tenantId: fixture.tenantId,
            entity: fixture.entities[0],
            population: fixture.entities,
            topK: 2,
            scoring: { mlEnabled: true, mlBlend: 0.4 },
        });
        const merge = service.merge({
            tenantId: fixture.tenantId,
            primaryId: fixture.entities[0].id,
            duplicateId: candidates[0].entityId,
            actor: 'observer@example.com',
            reason: 'Consolidation',
            policyTags: ['er:observed'],
        }, candidates[0]);
        (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('intelgraph.entities.candidates', vitest_1.expect.objectContaining({
            entityId: fixture.entities[0].id,
            candidates: 2,
        }));
        (0, vitest_1.expect)(metrics.observe).toHaveBeenCalledWith('intelgraph_er_candidates_ms', vitest_1.expect.any(Number), vitest_1.expect.objectContaining({ tenantId: fixture.tenantId }));
        (0, vitest_1.expect)(metrics.increment).toHaveBeenCalledWith('intelgraph_er_merges_total', 1, vitest_1.expect.objectContaining({ tenantId: fixture.tenantId }));
        (0, vitest_1.expect)(tracer.startSpan).toHaveBeenCalledWith('intelgraph.entities.merge', vitest_1.expect.objectContaining({ tenantId: fixture.tenantId }));
        (0, vitest_1.expect)(spans.some((span) => span.end.mock.calls.length > 0)).toBe(true);
        service.revertMerge(merge.mergeId, 'observer@example.com', 'test revert');
    });
    (0, vitest_1.it)('previews merge impact in a sandbox', () => {
        const service = new index_js_1.EntityResolutionService(() => new Date('2024-04-04T00:00:00Z'));
        const preview = service.previewMerge({
            tenantId: fixture.tenantId,
            primary: fixture.entities[0],
            duplicate: fixture.entities[1],
            population: fixture.entities,
            actor: 'analyst@example.com',
            thresholds: { autoMerge: 0.9, review: 0.7 },
            scoring: { mlEnabled: true, mlBlend: 0.3 },
        });
        (0, vitest_1.expect)(preview.impact.totalPopulation).toBeGreaterThan(0);
        (0, vitest_1.expect)(preview.decision).toBeDefined();
        (0, vitest_1.expect)(preview.sandboxId).toMatch(/-/);
    });
    (0, vitest_1.it)('clusters duplicates across sources and honors confidence for primaries', () => {
        const service = new index_js_1.EntityResolutionService(() => new Date('2024-05-05T00:00:00Z'));
        const population = [
            {
                id: 'p-100',
                tenantId: fixture.tenantId,
                type: 'person',
                name: 'Jane Roe',
                attributes: { location: 'Paris' },
                confidence: 0.9,
                source: 'crm',
            },
            {
                id: 'p-101',
                tenantId: fixture.tenantId,
                type: 'person',
                name: 'Jane Roe',
                attributes: { location: 'Paris' },
                confidence: 0.7,
                source: 'osint',
            },
            {
                id: 'p-200',
                tenantId: fixture.tenantId,
                type: 'organization',
                name: 'Acme Corp',
                attributes: {},
            },
        ];
        const clusters = service.resolveDuplicates({
            tenantId: fixture.tenantId,
            population,
            thresholds: { autoMerge: 0.8, review: 0.6 },
        });
        (0, vitest_1.expect)(clusters).toHaveLength(1);
        (0, vitest_1.expect)(clusters[0].primary.id).toBe('p-100');
        (0, vitest_1.expect)(clusters[0].duplicates[0].entityId).toBe('p-101');
        (0, vitest_1.expect)(clusters[0].rationale[0]).toContain('duplicates');
    });
    (0, vitest_1.it)('detects temporal spikes for entities', () => {
        vitest_1.vi.useFakeTimers();
        vitest_1.vi.setSystemTime(new Date('2024-05-05T00:00:00Z'));
        const service = new index_js_1.EntityResolutionService();
        const events = [
            { entityId: 'p-1', timestamp: '2024-05-01T00:00:00Z', type: 'mention' },
            { entityId: 'p-1', timestamp: '2024-05-02T00:00:00Z', type: 'mention' },
            { entityId: 'p-1', timestamp: '2024-03-01T00:00:00Z', type: 'mention' },
        ];
        const patterns = service.analyzeTemporalPatterns(events, 45, 1);
        vitest_1.vi.useRealTimers();
        (0, vitest_1.expect)(patterns[0].trend).toBe('spike');
        (0, vitest_1.expect)(patterns[0].evidence[0]).toContain('Recent events');
    });
    (0, vitest_1.it)('extracts entities from unstructured text with offsets', () => {
        const service = new index_js_1.EntityResolutionService();
        const text = 'On 2024-01-01 Jane Roe met Acme Corp in Paris City.';
        const extracted = service.extractEntitiesFromText(text, {
            tenantId: fixture.tenantId,
            source: 'report',
        });
        const person = extracted.find((item) => item.record.type === 'person');
        const org = extracted.find((item) => item.record.type === 'organization');
        const date = extracted.find((item) => item.record.type === 'date');
        (0, vitest_1.expect)(person?.offsets[0].start).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(org?.record.name).toBe('Acme Corp');
        (0, vitest_1.expect)(date?.record.name).toBe('2024-01-01');
    });
    (0, vitest_1.it)('provides explainability for candidate predictions', () => {
        const service = new index_js_1.EntityResolutionService();
        const explanation = service.explainPrediction(fixture.entities[0], fixture.entities[1], { autoMerge: 0.9, review: 0.7 }, { mlEnabled: true, mlBlend: 0.25 });
        (0, vitest_1.expect)(explanation.decision).toBeDefined();
        (0, vitest_1.expect)(Object.keys(explanation.contributions)).not.toHaveLength(0);
        (0, vitest_1.expect)(explanation.rationale.some((line) => line.includes('Weighted blend'))).toBe(true);
    });
});
