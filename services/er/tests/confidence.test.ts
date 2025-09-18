/**
 * Entity Resolution Confidence Engine Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ConfidenceEngine, EntityData, DEFAULT_CONSTRAINT_CONFIG } from '../src/confidence';

describe('ConfidenceEngine', () => {
  let engine: ConfidenceEngine;

  beforeEach(() => {
    engine = new ConfidenceEngine();
  });

  describe('Exact Match Scoring', () => {
    test('should score perfect name match as 1.0', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBeGreaterThan(0.8);
      expect(result.band).toBe('HIGH');
      expect(result.factors['name_exact_match']).toBe(1.0);
      expect(result.factors['email_exact_match']).toBe(1.0);
    });

    test('should handle missing fields gracefully', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          email: 'john@example.com'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBeLessThan(0.5);
      expect(result.band).toBe('LOW');
      expect(result.factors['name_exact_match']).toBe(0);
      expect(result.factors['email_exact_match']).toBe(0);
    });
  });

  describe('Fuzzy Match Scoring', () => {
    test('should score similar names with high fuzzy score', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'Jon Smith'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['name_fuzzy_match']).toBeGreaterThan(0.8);
      expect(result.score).toBeGreaterThan(0.7);
    });

    test('should score very different names with low fuzzy score', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'Alice Johnson'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['name_fuzzy_match']).toBeLessThan(0.5);
    });
  });

  describe('Company Entity Matching', () => {
    test('should match companies with exact EIN', async () => {
      const primaryEntity: EntityData = {
        id: 'company_1',
        type: 'Company',
        attributes: {
          name: 'Acme Corp',
          ein: '12-3456789',
          website: 'acme.com'
        }
      };

      const candidateEntity: EntityData = {
        id: 'company_2',
        type: 'Company',
        attributes: {
          name: 'ACME Corporation',
          ein: '12-3456789',
          website: 'www.acme.com'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['ein_exact_match']).toBe(1.0);
      expect(result.score).toBeGreaterThan(0.9);
      expect(result.band).toBe('HIGH');
    });

    test('should handle company name variations', async () => {
      const primaryEntity: EntityData = {
        id: 'company_1',
        type: 'Company',
        attributes: {
          name: 'Acme Corp'
        }
      };

      const candidateEntity: EntityData = {
        id: 'company_2',
        type: 'Company',
        attributes: {
          name: 'ACME Corporation Inc.'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['name_fuzzy_match']).toBeGreaterThan(0.7);
    });
  });

  describe('Confidence Bands', () => {
    test('should assign HIGH band for scores >= 0.92', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1-555-0123'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1-555-0123'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBeGreaterThanOrEqual(0.92);
      expect(result.band).toBe('HIGH');
    });

    test('should assign MID band for scores 0.75-0.91', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          phone: '+1-555-0123'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'Jon Smith',
          phone: '+1-555-0123'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBeGreaterThanOrEqual(0.75);
      expect(result.score).toBeLessThan(0.92);
      expect(result.band).toBe('MID');
    });

    test('should assign LOW band for scores < 0.75', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'Alice Johnson'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBeLessThan(0.75);
      expect(result.band).toBe('LOW');
    });
  });

  describe('Auto-merge Determination', () => {
    test('should recommend auto-merge for very high confidence', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1-555-0123'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1-555-0123'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.should_auto_merge).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.95);
    });

    test('should not recommend auto-merge for medium confidence', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          name: 'Jon Smith'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.should_auto_merge).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple candidates efficiently', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      };

      const candidates: EntityData[] = [
        {
          id: 'person_2',
          type: 'Person',
          attributes: { name: 'Jon Smith', email: 'j.smith@example.com' }
        },
        {
          id: 'person_3',
          type: 'Person',
          attributes: { name: 'John Smith', email: 'john@example.com' }
        },
        {
          id: 'person_4',
          type: 'Person',
          attributes: { name: 'Alice Johnson', email: 'alice@example.com' }
        }
      ];

      const start = Date.now();
      const results = await engine.computeBatchConfidence(primaryEntity, candidates);
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(1000); // Should complete in <1s

      // Results should be sorted by confidence (highest first)
      expect(results[0].confidence.score).toBeGreaterThanOrEqual(results[1].confidence.score);
      expect(results[1].confidence.score).toBeGreaterThanOrEqual(results[2].confidence.score);
    });
  });

  describe('Configuration Management', () => {
    test('should allow updating thresholds', () => {
      engine.updateConfig({
        high_threshold: 0.95,
        mid_threshold: 0.80,
        auto_merge_threshold: 0.98
      });

      const config = engine.getConfiguration();
      expect(config.config.high_threshold).toBe(0.95);
      expect(config.config.mid_threshold).toBe(0.80);
      expect(config.config.auto_merge_threshold).toBe(0.98);
    });

    test('should allow adding custom similarity factors', () => {
      const customFactor = {
        name: 'custom_id_match',
        type: 'exact_match' as const,
        weight: 0.9,
        applicable_entity_types: ['Person'],
        config: {}
      };

      engine.addSimilarityFactor(customFactor);

      const config = engine.getConfiguration();
      const factor = config.factors.find(f => f.name === 'custom_id_match');
      expect(factor).toBeDefined();
      expect(factor?.weight).toBe(0.9);
    });
  });

  describe('Value Normalization', () => {
    test('should normalize phone numbers correctly', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          phone: '+1 (555) 123-4567'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          phone: '555.123.4567'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['phone_exact_match']).toBe(1.0);
    });

    test('should normalize email addresses correctly', async () => {
      const primaryEntity: EntityData = {
        id: 'person_1',
        type: 'Person',
        attributes: {
          email: 'John.Smith@Example.com'
        }
      };

      const candidateEntity: EntityData = {
        id: 'person_2',
        type: 'Person',
        attributes: {
          email: 'john.smith@example.com'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['email_exact_match']).toBe(1.0);
    });

    test('should normalize company names correctly', async () => {
      const primaryEntity: EntityData = {
        id: 'company_1',
        type: 'Company',
        attributes: {
          name: 'Acme Corp Inc.'
        }
      };

      const candidateEntity: EntityData = {
        id: 'company_2',
        type: 'Company',
        attributes: {
          name: 'ACME CORP'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.factors['name_exact_match']).toBe(1.0);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle empty entities gracefully', async () => {
      const primaryEntity: EntityData = {
        id: 'empty_1',
        type: 'Person',
        attributes: {}
      };

      const candidateEntity: EntityData = {
        id: 'empty_2',
        type: 'Person',
        attributes: {}
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result.score).toBe(0);
      expect(result.band).toBe('LOW');
      expect(result.should_auto_merge).toBe(false);
    });

    test('should handle null and undefined values', async () => {
      const primaryEntity: EntityData = {
        id: 'null_1',
        type: 'Person',
        attributes: {
          name: null,
          email: undefined,
          phone: ''
        }
      };

      const candidateEntity: EntityData = {
        id: 'null_2',
        type: 'Person',
        attributes: {
          name: 'John Smith',
          email: 'john@example.com'
        }
      };

      const result = await engine.computeConfidence(primaryEntity, candidateEntity);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should process large attribute sets efficiently', async () => {
      const largeAttributes: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeAttributes[`field_${i}`] = `value_${i}`;
      }

      const primaryEntity: EntityData = {
        id: 'large_1',
        type: 'Person',
        attributes: { name: 'John Smith', ...largeAttributes }
      };

      const candidateEntity: EntityData = {
        id: 'large_2',
        type: 'Person',
        attributes: { name: 'John Smith', ...largeAttributes }
      };

      const start = Date.now();
      const result = await engine.computeConfidence(primaryEntity, candidateEntity);
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });
});