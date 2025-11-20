import { describe, it, expect } from '@jest/globals';
import {
  DeterministicScorer,
  ProbabilisticScorer,
  HybridScorer,
  createScorer,
} from '../../src/scoring/scorer';
import type { EntityRecord, ScoringConfig } from '../../src/types';
import { DEFAULT_SCORING_CONFIG } from '../../src/types';

describe('Scoring System', () => {
  const entityA: EntityRecord = {
    id: 'e1',
    type: 'person',
    name: 'John Smith',
    tenantId: 'test',
    attributes: { email: 'john@example.com' },
    deviceIds: ['device-1'],
  };

  const entityB: EntityRecord = {
    id: 'e2',
    type: 'person',
    name: 'Jon Smith',
    tenantId: 'test',
    attributes: { email: 'john@example.com' },
    deviceIds: ['device-1'],
  };

  describe('DeterministicScorer', () => {
    it('should score similar entities highly', () => {
      const scorer = new DeterministicScorer(DEFAULT_SCORING_CONFIG);
      const result = scorer.score(entityA, entityB);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.entityId).toBe('e2');
      expect(result.method).toBe('deterministic');
      expect(result.rationale).toBeInstanceOf(Array);
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it('should score different entities lowly', () => {
      const entityC = {
        ...entityB,
        name: 'Jane Doe',
        attributes: { email: 'jane@example.com' },
        deviceIds: ['device-2'],
      };

      const scorer = new DeterministicScorer(DEFAULT_SCORING_CONFIG);
      const result = scorer.score(entityA, entityC);

      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('ProbabilisticScorer', () => {
    it('should provide confidence estimates', () => {
      const scorer = new ProbabilisticScorer(DEFAULT_SCORING_CONFIG);
      const result = scorer.score(entityA, entityB);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.method).toBe('probabilistic');
    });

    it('should have higher confidence with more signals', () => {
      const entityWithMoreSignals = {
        ...entityB,
        locations: [{ lat: 40.7128, lon: -74.0060 }],
        timestamps: ['2024-01-15T10:00:00Z'],
      };

      const entityAWithSignals = {
        ...entityA,
        locations: [{ lat: 40.7128, lon: -74.0060 }],
        timestamps: ['2024-01-15T10:00:00Z'],
      };

      const scorer = new ProbabilisticScorer(DEFAULT_SCORING_CONFIG);
      const result1 = scorer.score(entityA, entityB);
      const result2 = scorer.score(entityAWithSignals, entityWithMoreSignals);

      expect(result2.confidence).toBeGreaterThanOrEqual(result1.confidence);
    });
  });

  describe('HybridScorer', () => {
    it('should combine deterministic and probabilistic approaches', () => {
      const scorer = new HybridScorer(DEFAULT_SCORING_CONFIG);
      const result = scorer.score(entityA, entityB);

      expect(result.method).toBe('hybrid');
      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.rationale).toContain(expect.stringMatching(/Hybrid score/));
    });
  });

  describe('createScorer', () => {
    it('should create deterministic scorer', () => {
      const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, method: 'deterministic' };
      const scorer = createScorer(config);
      expect(scorer.getMethod()).toBe('deterministic');
    });

    it('should create probabilistic scorer', () => {
      const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, method: 'probabilistic' };
      const scorer = createScorer(config);
      expect(scorer.getMethod()).toBe('probabilistic');
    });

    it('should create hybrid scorer', () => {
      const config: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, method: 'hybrid' };
      const scorer = createScorer(config);
      expect(scorer.getMethod()).toBe('hybrid');
    });
  });
});
