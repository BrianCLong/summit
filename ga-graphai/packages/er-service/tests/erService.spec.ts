import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EntityResolutionService, type CandidateScore, type EntityRecord } from '../src/index.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/golden.json', import.meta.url), 'utf8')
) as { tenantId: string; entities: EntityRecord[] };

describe('EntityResolutionService', () => {
  it('returns reproducible candidate ordering on golden dataset', () => {
    const service = new EntityResolutionService(() => new Date('2024-01-01T00:00:00Z'));
    const entity = fixture.entities[0];
    const population = fixture.entities;
    const { candidates } = service.candidates({
      tenantId: fixture.tenantId,
      entity,
      population,
      topK: 3
    });
    expect(candidates[0].entityId).toBe('p-2');
    expect(candidates[0].score).toBeGreaterThan(0.8);
  });

  it('merges duplicates and supports explain + revert', () => {
    const service = new EntityResolutionService(() => new Date('2024-02-02T10:00:00Z'));
    const { candidates } = service.candidates({
      tenantId: fixture.tenantId,
      entity: fixture.entities[0],
      population: fixture.entities
    });
    const top: CandidateScore = candidates[0];
    const merge = service.merge(
      {
        tenantId: fixture.tenantId,
        primaryId: 'p-1',
        duplicateId: top.entityId,
        actor: 'analyst@example.com',
        reason: 'Duplicate person record',
        policyTags: ['er:manual-review']
      },
      top
    );
    expect(merge.reversible).toBe(true);
    const explanation = service.explain(merge.mergeId);
    expect(explanation.features.nameSimilarity).toBeGreaterThan(0.7);
    expect(explanation.policyTags).toContain('er:manual-review');
    service.revertMerge(merge.mergeId, 'lead@example.com', 'Confirmed false positive');
    expect(service.getMerge(merge.mergeId)).toBeUndefined();
    const audit = service.getAuditLog();
    const events = audit.filter(entry => entry.target === merge.mergeId);
    expect(events).toHaveLength(2);
    expect(events[1].event).toBe('revert');
  });
});
