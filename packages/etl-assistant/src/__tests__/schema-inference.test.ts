/**
 * Schema Inference Tests
 */

import { SchemaInference } from '../schema-inference';
import type { SampleRecord } from '../types';

describe('SchemaInference', () => {
  let inference: SchemaInference;

  beforeEach(() => {
    inference = new SchemaInference();
  });

  describe('inferSchema', () => {
    it('should infer Person entity type from sample records', () => {
      const samples: SampleRecord[] = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          age: 30,
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          age: 28,
        },
      ];

      const result = inference.inferSchema(samples);

      expect(result.entityType).toBe('Person');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.fieldMappings).toBeDefined();
      expect(result.fieldMappings.length).toBeGreaterThan(0);
    });

    it('should infer Organization entity type from sample records', () => {
      const samples: SampleRecord[] = [
        {
          company: 'Acme Corp',
          industry: 'Technology',
          website: 'https://acme.com',
        },
        {
          company: 'TechStart Inc',
          industry: 'Software',
          website: 'https://techstart.io',
        },
      ];

      const result = inference.inferSchema(samples);

      expect(result.entityType).toBe('Organization');
      expect(result.fieldMappings).toBeDefined();
    });

    it('should detect email field type', () => {
      const samples: SampleRecord[] = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ];

      const result = inference.inferSchema(samples);

      const emailField = result.statistics.fields.find((f) => f.field === 'email');
      expect(emailField?.type).toBe('email');
    });

    it('should calculate field statistics', () => {
      const samples: SampleRecord[] = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: null },
      ];

      const result = inference.inferSchema(samples);

      expect(result.statistics.recordCount).toBe(3);
      expect(result.statistics.fieldCount).toBe(2);

      const ageField = result.statistics.fields.find((f) => f.field === 'age');
      expect(ageField?.nullCount).toBe(1);
      expect(ageField?.uniqueCount).toBe(2);
    });

    it('should use schema hint when provided', () => {
      const samples: SampleRecord[] = [
        { title: 'Document 1', content: 'Some content' },
      ];

      const result = inference.inferSchema(samples, 'document');

      expect(result.entityType).toBe('Document');
    });

    it('should throw error when no samples provided', () => {
      expect(() => inference.inferSchema([])).toThrow('No sample records provided');
    });
  });
});
