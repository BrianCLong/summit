import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  EntityResolutionService,
  type CandidateScore,
  type EntityRecord,
} from '../src/index.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/golden.json', import.meta.url), 'utf8'),
) as { tenantId: string; entities: EntityRecord[] };

describe('EntityResolutionService', () => {
  it('returns reproducible candidate ordering on golden dataset', () => {
    const service = new EntityResolutionService(
      () => new Date('2024-01-01T00:00:00Z'),
    );
    const entity = fixture.entities[0];
    const population = fixture.entities;
    const { candidates } = service.candidates({
      tenantId: fixture.tenantId,
      entity,
      population,
      topK: 3,
    });
    expect(candidates[0].entityId).toBe('p-2');
    expect(candidates[0].score).toBeGreaterThan(0.8);
    expect(candidates[0].decision).toBeDefined();
  });

  it('merges duplicates and supports explain + revert', () => {
    const service = new EntityResolutionService(
      () => new Date('2024-02-02T10:00:00Z'),
    );
    const { candidates } = service.candidates({
      tenantId: fixture.tenantId,
      entity: fixture.entities[0],
      population: fixture.entities,
    });
    const top: CandidateScore = candidates[0];
    const merge = service.merge(
      {
        tenantId: fixture.tenantId,
        primaryId: 'p-1',
        duplicateId: top.entityId,
        actor: 'analyst@example.com',
        reason: 'Duplicate person record',
        policyTags: ['er:manual-review'],
        model: { id: 'rules-v1', version: '1.0.0', hash: 'rules-only' },
      },
      top,
    );
    expect(merge.reversible).toBe(true);
    expect(merge.modelHash).toBe('rules-only');
    const explanation = service.explain(merge.mergeId);
    expect(explanation.features.nameSimilarity).toBeGreaterThan(0.7);
    expect(explanation.policyTags).toContain('er:manual-review');
    expect(explanation.modelHash).toBe('rules-only');
    service.revertMerge(
      merge.mergeId,
      'lead@example.com',
      'Confirmed false positive',
    );
    expect(service.getMerge(merge.mergeId)).toBeUndefined();
    const audit = service.getAuditLog();
    const events = audit.filter((entry) => entry.target === merge.mergeId);
    expect(events).toHaveLength(2);
    expect(events[1].event).toBe('revert');
  });

  it('emits structured observability for entity extraction workflows', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const metrics = { observe: vi.fn(), increment: vi.fn() };
    const spans: { name: string; end: ReturnType<typeof vi.fn> }[] = [];
    const tracer = {
      startSpan: vi.fn((name: string) => {
        const end = vi.fn();
        const span = { name, end, recordException: vi.fn() };
        spans.push({ name, end });
        return span;
      }),
    };

    const service = new EntityResolutionService(
      () => new Date('2024-03-03T00:00:00Z'),
      { logger, metrics, tracer },
    );

    const { candidates } = service.candidates({
      tenantId: fixture.tenantId,
      entity: fixture.entities[0],
      population: fixture.entities,
      topK: 2,
      scoring: { mlEnabled: true, mlBlend: 0.4 },
    });

    const merge = service.merge(
      {
        tenantId: fixture.tenantId,
        primaryId: fixture.entities[0].id,
        duplicateId: candidates[0].entityId,
        actor: 'observer@example.com',
        reason: 'Consolidation',
        policyTags: ['er:observed'],
      },
      candidates[0],
    );

    expect(logger.info).toHaveBeenCalledWith(
      'intelgraph.entities.candidates',
      expect.objectContaining({
        entityId: fixture.entities[0].id,
        candidates: 2,
      }),
    );
    expect(metrics.observe).toHaveBeenCalledWith(
      'intelgraph_er_candidates_ms',
      expect.any(Number),
      expect.objectContaining({ tenantId: fixture.tenantId }),
    );
    expect(metrics.increment).toHaveBeenCalledWith(
      'intelgraph_er_merges_total',
      1,
      expect.objectContaining({ tenantId: fixture.tenantId }),
    );
    expect(tracer.startSpan).toHaveBeenCalledWith(
      'intelgraph.entities.merge',
      expect.objectContaining({ tenantId: fixture.tenantId }),
    );
    expect(spans.some((span) => span.end.mock.calls.length > 0)).toBe(true);

    service.revertMerge(merge.mergeId, 'observer@example.com', 'test revert');
  });

  it('previews merge impact in a sandbox', () => {
    const service = new EntityResolutionService(
      () => new Date('2024-04-04T00:00:00Z'),
    );
    const preview = service.previewMerge({
      tenantId: fixture.tenantId,
      primary: fixture.entities[0],
      duplicate: fixture.entities[1],
      population: fixture.entities,
      actor: 'analyst@example.com',
      thresholds: { autoMerge: 0.9, review: 0.7 },
      scoring: { mlEnabled: true, mlBlend: 0.3 },
    });
    expect(preview.impact.totalPopulation).toBeGreaterThan(0);
    expect(preview.decision).toBeDefined();
    expect(preview.sandboxId).toMatch(/-/);
  });

  it('clusters duplicates across sources and honors confidence for primaries', () => {
    const service = new EntityResolutionService(
      () => new Date('2024-05-05T00:00:00Z'),
    );
    const population: EntityRecord[] = [
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

    expect(clusters).toHaveLength(1);
    expect(clusters[0].primary.id).toBe('p-100');
    expect(clusters[0].duplicates[0].entityId).toBe('p-101');
    expect(clusters[0].rationale[0]).toContain('duplicates');
  });

  it('detects temporal spikes for entities', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-05T00:00:00Z'));
    const service = new EntityResolutionService();
    const events = [
      { entityId: 'p-1', timestamp: '2024-05-01T00:00:00Z', type: 'mention' },
      { entityId: 'p-1', timestamp: '2024-05-02T00:00:00Z', type: 'mention' },
      { entityId: 'p-1', timestamp: '2024-03-01T00:00:00Z', type: 'mention' },
    ];

    const patterns = service.analyzeTemporalPatterns(events, 45, 1);
    vi.useRealTimers();

    expect(patterns[0].trend).toBe('spike');
    expect(patterns[0].evidence[0]).toContain('Recent events');
  });

  it('extracts entities from unstructured text with offsets', () => {
    const service = new EntityResolutionService();
    const text = 'On 2024-01-01 Jane Roe met Acme Corp in Paris City.';
    const extracted = service.extractEntitiesFromText(text, {
      tenantId: fixture.tenantId,
      source: 'report',
    });

    const person = extracted.find((item) => item.record.type === 'person');
    const org = extracted.find((item) => item.record.type === 'organization');
    const date = extracted.find((item) => item.record.type === 'date');

    expect(person?.offsets[0].start).toBeGreaterThanOrEqual(0);
    expect(org?.record.name).toBe('Acme Corp');
    expect(date?.record.name).toBe('2024-01-01');
  });

  it('provides explainability for candidate predictions', () => {
    const service = new EntityResolutionService();
    const explanation = service.explainPrediction(
      fixture.entities[0],
      fixture.entities[1],
      { autoMerge: 0.9, review: 0.7 },
      { mlEnabled: true, mlBlend: 0.25 },
    );

    expect(explanation.decision).toBeDefined();
    expect(Object.keys(explanation.contributions)).not.toHaveLength(0);
    expect(explanation.rationale.some((line) => line.includes('Weighted blend'))).toBe(true);
  });
});
