import { describe, it, expect, beforeEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EREngine } from '../../src/core/er-engine';
import type { EntityRecord } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ER Engine Integration', () => {
  let engine: EREngine;
  let goldenDataset: { tenantId: string; entities: EntityRecord[] };

  beforeEach(() => {
    engine = new EREngine();

    // Load golden dataset
    const dataPath = join(__dirname, '../fixtures/golden-dataset.json');
    goldenDataset = JSON.parse(readFileSync(dataPath, 'utf-8'));

    // Store entities in engine for testing
    goldenDataset.entities.forEach(entity => {
      engine.storeEntity(entity);
    });
  });

  describe('Candidate Finding', () => {
    it('should find high-quality candidates for duplicate entities', () => {
      const entity = goldenDataset.entities[0]; // John Michael Smith
      const population = goldenDataset.entities;

      const result = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        topK: 3,
        threshold: 0.7,
      });

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].entityId).toBe('person-002'); // Jon M. Smith
      expect(result.candidates[0].score).toBeGreaterThan(0.8);
      expect(result.requestId).toBeDefined();
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    it('should respect topK parameter', () => {
      const entity = goldenDataset.entities[0];
      const population = goldenDataset.entities;

      const result = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        topK: 2,
        threshold: 0.3,
      });

      expect(result.candidates.length).toBeLessThanOrEqual(2);
    });

    it('should filter by threshold', () => {
      const entity = goldenDataset.entities[2]; // Jane Doe
      const population = goldenDataset.entities;

      const result = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        topK: 10,
        threshold: 0.9, // Very high threshold
      });

      // Jane should not match John entities with high threshold
      expect(result.candidates.length).toBe(0);
    });

    it('should use different scoring methods', () => {
      const entity = goldenDataset.entities[0];
      const population = goldenDataset.entities;

      const detResult = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        method: 'deterministic',
      });

      const probResult = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        method: 'probabilistic',
      });

      expect(detResult.method).toBe('deterministic');
      expect(probResult.method).toBe('probabilistic');
    });
  });

  describe('Merge Operations', () => {
    it('should merge entities successfully', () => {
      const mergeResult = engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: ['person-001', 'person-002'],
        actor: 'test-analyst@example.com',
        reason: 'Same person with spelling variation',
        policyTags: ['er:manual-review'],
      });

      expect(mergeResult.mergeId).toBeDefined();
      expect(mergeResult.primaryId).toBe('person-001');
      expect(mergeResult.mergedIds).toContain('person-002');
      expect(mergeResult.reversible).toBe(true);
      expect(mergeResult.actor).toBe('test-analyst@example.com');
    });

    it('should require at least 2 entities', () => {
      expect(() => {
        engine.merge({
          tenantId: goldenDataset.tenantId,
          entityIds: ['person-001'],
          actor: 'test@example.com',
          reason: 'Test',
        });
      }).toThrow('At least 2 entity IDs required');
    });

    it('should revert merge successfully', () => {
      const mergeResult = engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: ['person-001', 'person-002'],
        actor: 'analyst@example.com',
        reason: 'Duplicate detection',
      });

      engine.revertMerge(
        mergeResult.mergeId,
        'supervisor@example.com',
        'False positive',
      );

      const merge = engine.getMerge(mergeResult.mergeId);
      expect(merge).toBeUndefined();

      // Check audit log
      const auditLog = engine.getAuditLog({ event: 'revert' });
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].event).toBe('revert');
      expect(auditLog[0].reason).toBe('False positive');
    });

    it('should track merge in audit log', () => {
      engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: ['person-003', 'person-004'],
        actor: 'analyst@example.com',
        reason: 'Test merge',
      });

      const auditLog = engine.getAuditLog({
        tenantId: goldenDataset.tenantId,
        event: 'merge',
      });

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].event).toBe('merge');
      expect(auditLog[0].actor).toBe('analyst@example.com');
    });
  });

  describe('Split Operations', () => {
    it('should split entity successfully', () => {
      const splitResult = engine.split({
        tenantId: goldenDataset.tenantId,
        entityId: 'person-001',
        splitGroups: [
          {
            attributes: { context: 'work' },
            deviceIds: ['device-abc123'],
          },
          {
            attributes: { context: 'personal' },
            deviceIds: ['device-def456'],
          },
        ],
        actor: 'analyst@example.com',
        reason: 'Separate work and personal identities',
      });

      expect(splitResult.splitId).toBeDefined();
      expect(splitResult.originalEntityId).toBe('person-001');
      expect(splitResult.newEntityIds.length).toBe(2);
      expect(splitResult.actor).toBe('analyst@example.com');

      // Verify new entities were created
      const newEntity1 = engine.getEntity(splitResult.newEntityIds[0]);
      const newEntity2 = engine.getEntity(splitResult.newEntityIds[1]);
      expect(newEntity1).toBeDefined();
      expect(newEntity2).toBeDefined();
    });

    it('should require at least 2 split groups', () => {
      expect(() => {
        engine.split({
          tenantId: goldenDataset.tenantId,
          entityId: 'person-001',
          splitGroups: [{ attributes: {} }],
          actor: 'test@example.com',
          reason: 'Test',
        });
      }).toThrow('At least 2 split groups required');
    });

    it('should track split in audit log', () => {
      engine.split({
        tenantId: goldenDataset.tenantId,
        entityId: 'person-001',
        splitGroups: [
          { attributes: { group: 'A' } },
          { attributes: { group: 'B' } },
        ],
        actor: 'analyst@example.com',
        reason: 'Test split',
      });

      const auditLog = engine.getAuditLog({ event: 'split' });
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].event).toBe('split');
    });
  });

  describe('Explainability', () => {
    it('should provide detailed explanation for merge', () => {
      const mergeResult = engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: ['person-001', 'person-002'],
        actor: 'analyst@example.com',
        reason: 'High similarity match',
        policyTags: ['er:high-confidence'],
      });

      const explanation = engine.explain(mergeResult.mergeId);

      expect(explanation.mergeId).toBe(mergeResult.mergeId);
      expect(explanation.features).toBeDefined();
      expect(explanation.rationale).toBeInstanceOf(Array);
      expect(explanation.rationale.length).toBeGreaterThan(0);
      expect(explanation.featureWeights).toBeDefined();
      expect(explanation.threshold).toBeDefined();
      expect(explanation.policyTags).toContain('er:high-confidence');
    });

    it('should include feature weights in explanation', () => {
      const mergeResult = engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: ['org-001', 'org-002'],
        actor: 'analyst@example.com',
        reason: 'Same organization',
      });

      const explanation = engine.explain(mergeResult.mergeId);
      const weights = explanation.featureWeights;

      expect(weights.nameSimilarity).toBeDefined();
      expect(weights.typeMatch).toBeDefined();
      expect(Object.keys(weights).length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent merge', () => {
      expect(() => {
        engine.explain('non-existent-merge-id');
      }).toThrow('Explanation for merge non-existent-merge-id not found');
    });
  });

  describe('Reproducible Merge Test (Golden Dataset)', () => {
    it('should produce consistent results on golden dataset', () => {
      const entity = goldenDataset.entities[0]; // John Michael Smith
      const population = goldenDataset.entities;

      const result = engine.candidates({
        tenantId: goldenDataset.tenantId,
        entity,
        population,
        topK: 3,
      });

      // Reproducible: top candidate should always be person-002
      expect(result.candidates[0].entityId).toBe('person-002');
      expect(result.candidates[0].score).toBeGreaterThan(0.8);

      // Merge should succeed
      const mergeResult = engine.merge({
        tenantId: goldenDataset.tenantId,
        entityIds: [entity.id, result.candidates[0].entityId],
        actor: 'system@example.com',
        reason: 'Automated ER',
      });

      expect(mergeResult.reversible).toBe(true);

      // Explanation should be available
      const explanation = engine.explain(mergeResult.mergeId);
      expect(explanation.features.nameSimilarity).toBeGreaterThan(0.7);
    });
  });
});
