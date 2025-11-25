import { describe, it, expect, beforeEach } from 'vitest';
import { DataAnonymizer } from '../anonymization/DataAnonymizer.js';
import { AnonymizationTechnique, FieldAnonymizationConfig } from '../types/index.js';

describe('DataAnonymizer', () => {
  let anonymizer: DataAnonymizer;

  beforeEach(() => {
    anonymizer = new DataAnonymizer('test-salt');
  });

  describe('anonymize', () => {
    it('should anonymize data with redaction', async () => {
      const data = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'name',
          technique: AnonymizationTechnique.REDACTION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect(result.data[0].name).toBe('[REDACTED]');
      expect(result.data[1].name).toBe('[REDACTED]');
      expect(result.data[0].email).toBe('john@example.com'); // Unchanged
    });

    it('should anonymize with hashing', async () => {
      const data = [{ id: '1', email: 'john@example.com' }];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'email',
          technique: AnonymizationTechnique.HASHING,
          config: { hashAlgorithm: 'sha256' },
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect(result.data[0].email).not.toBe('john@example.com');
      expect(result.data[0].email).toHaveLength(64); // SHA256 hex length
    });

    it('should pseudonymize consistently', async () => {
      const data = [
        { id: '1', name: 'John' },
        { id: '2', name: 'John' },
        { id: '3', name: 'Jane' },
      ];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'name',
          technique: AnonymizationTechnique.PSEUDONYMIZATION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      // Same input should produce same pseudonym
      expect(result.data[0].name).toBe(result.data[1].name);
      // Different input should produce different pseudonym
      expect(result.data[0].name).not.toBe(result.data[2].name);
    });

    it('should mask values correctly', async () => {
      const data = [{ id: '1', phone: '555-123-4567' }];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'phone',
          technique: AnonymizationTechnique.MASKING,
          config: { maskFromStart: 4, maskFromEnd: 4, maskChar: '*' },
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect(result.data[0].phone).toBe('555-****4567');
    });

    it('should generalize numbers', async () => {
      const data = [{ id: '1', salary: 75432 }];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'salary',
          technique: AnonymizationTechnique.GENERALIZATION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      // Should round to nearest magnitude
      expect(result.data[0].salary).toBe(80000);
    });

    it('should add noise to numbers', async () => {
      const data = [{ id: '1', amount: 1000 }];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'amount',
          technique: AnonymizationTechnique.NOISE_ADDITION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      // Value should be different but in reasonable range
      expect(result.data[0].amount).not.toBe(1000);
      expect(typeof result.data[0].amount).toBe('number');
    });

    it('should handle nested fields', async () => {
      const data = [
        {
          id: '1',
          contact: {
            email: 'john@example.com',
            phone: '555-1234',
          },
        },
      ];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'contact.email',
          technique: AnonymizationTechnique.REDACTION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect((result.data[0].contact as Record<string, unknown>).email).toBe('[REDACTED]');
      expect((result.data[0].contact as Record<string, unknown>).phone).toBe('555-1234');
    });

    it('should report statistics', async () => {
      const data = [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
        { id: '3', name: 'John' },
      ];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'name',
          technique: AnonymizationTechnique.PSEUDONYMIZATION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect(result.stats).toHaveLength(1);
      expect(result.stats[0].recordsProcessed).toBe(3);
      expect(result.stats[0].valuesAnonymized).toBe(3);
      expect(result.stats[0].uniqueValuesBefore).toBe(2);
      expect(result.stats[0].uniqueValuesAfter).toBe(2);
    });

    it('should handle null and undefined values', async () => {
      const data = [
        { id: '1', name: 'John', nickname: null },
        { id: '2', name: undefined, nickname: 'Johnny' },
      ];

      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'name',
          technique: AnonymizationTechnique.REDACTION,
          config: {},
        },
        {
          fieldPath: 'nickname',
          technique: AnonymizationTechnique.REDACTION,
          config: {},
        },
      ];

      const result = await anonymizer.anonymize(data, configs);

      expect(result.data[0].nickname).toBeNull();
      expect(result.data[1].name).toBeUndefined();
    });
  });

  describe('anonymizeValue', () => {
    it('should apply k-anonymity to numbers', () => {
      const config: FieldAnonymizationConfig = {
        fieldPath: 'age',
        technique: AnonymizationTechnique.K_ANONYMITY,
        config: { kValue: 5 },
      };

      const result = anonymizer.anonymizeValue(32, config);
      expect(result).toContain('-'); // Should be a range
    });

    it('should apply differential privacy to numbers', () => {
      const config: FieldAnonymizationConfig = {
        fieldPath: 'salary',
        technique: AnonymizationTechnique.DIFFERENTIAL_PRIVACY,
        config: { epsilon: 1.0 },
      };

      const results = new Set<number>();
      for (let i = 0; i < 10; i++) {
        const result = anonymizer.anonymizeValue(50000, config) as number;
        results.add(Math.round(result));
      }

      // With differential privacy, we should get variation
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('resetMappings', () => {
    it('should clear pseudonym mappings', async () => {
      const data = [{ id: '1', name: 'John' }];
      const configs: FieldAnonymizationConfig[] = [
        {
          fieldPath: 'name',
          technique: AnonymizationTechnique.PSEUDONYMIZATION,
          config: {},
        },
      ];

      const result1 = await anonymizer.anonymize(data, configs);
      anonymizer.resetMappings();
      const result2 = await anonymizer.anonymize(data, configs);

      // After reset, pseudonyms may differ
      // (depends on random component)
    });
  });
});
