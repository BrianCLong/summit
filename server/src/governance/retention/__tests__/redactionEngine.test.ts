import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { RedactionEngine } from '../redactionEngine.js';
import { RedactionRule } from '../types.js';

describe('RedactionEngine', () => {
  let pool: Pool;
  let engine: RedactionEngine;

  beforeEach(() => {
    pool = {
      query: jest.fn(),
    } as any;

    engine = new RedactionEngine({ pool });
  });

  describe('Field Redaction Operations', () => {
    it('should mask a value with asterisks', async () => {
      const record = {
        email: 'user@example.com',
        password: 'secret123',
      };

      const rules: RedactionRule[] = [
        {
          id: 'mask-rule',
          fieldPattern: 'password',
          operation: 'mask',
          storageTargets: ['postgres'],
          parameters: {
            maskChar: '*',
            preserveLength: true,
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].fieldName).toBe('password');
      expect(result.fields[0].redactedValue).toBe('*********');
      expect(record.password).toBe('*********');
    });

    it('should hash a value', async () => {
      const record = {
        ssn: '123-45-6789',
      };

      const rules: RedactionRule[] = [
        {
          id: 'hash-rule',
          fieldPattern: 'ssn',
          operation: 'hash',
          storageTargets: ['postgres'],
          parameters: {
            hashAlgorithm: 'sha256',
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toMatch(/^[a-f0-9]{64}$/);
      expect(record.ssn).not.toBe('123-45-6789');
    });

    it('should delete a field', async () => {
      const record = {
        name: 'John Doe',
        age: 30,
        sensitiveData: 'to be deleted',
      };

      const rules: RedactionRule[] = [
        {
          id: 'delete-rule',
          fieldPattern: 'sensitiveData',
          operation: 'delete',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toBeNull();
      expect(record.sensitiveData).toBeNull();
    });

    it('should anonymize an email field', async () => {
      const record = {
        email: 'john.doe@company.com',
      };

      const rules: RedactionRule[] = [
        {
          id: 'anon-rule',
          fieldPattern: 'email',
          operation: 'anonymize',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toMatch(
        /anonymous-[a-f0-9]+@example\.com/,
      );
      expect(result.fields[0].redactedValue).not.toBe('john.doe@company.com');
    });

    it('should pseudonymize consistently', async () => {
      const record1 = { userId: 'user123' };
      const record2 = { userId: 'user123' };

      const rules: RedactionRule[] = [
        {
          id: 'pseudo-rule',
          fieldPattern: 'userId',
          operation: 'pseudonymize',
          storageTargets: ['postgres'],
        },
      ];

      const result1 = await engine.redactRecord(record1, rules, {
        recordId: '1',
        storageSystem: 'postgres',
      });

      const result2 = await engine.redactRecord(record2, rules, {
        recordId: '2',
        storageSystem: 'postgres',
      });

      // Same value should produce same pseudonym
      expect(result1.fields[0].redactedValue).toBe(
        result2.fields[0].redactedValue,
      );
      expect(result1.fields[0].redactedValue).not.toBe('user123');
    });

    it('should truncate long values', async () => {
      const record = {
        description: 'This is a very long description that exceeds the maximum allowed length',
      };

      const rules: RedactionRule[] = [
        {
          id: 'truncate-rule',
          fieldPattern: 'description',
          operation: 'truncate',
          storageTargets: ['postgres'],
          parameters: {
            maxLength: 20,
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toBe('This is a very long ...');
      expect(result.fields[0].redactedValue.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('should generalize age to age range', async () => {
      const record = {
        age: 35,
      };

      const rules: RedactionRule[] = [
        {
          id: 'generalize-rule',
          fieldPattern: 'age',
          operation: 'generalize',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toBe('30-49');
    });
  });

  describe('Rule Matching', () => {
    it('should match wildcard patterns', async () => {
      const record = {
        userEmail: 'test@example.com',
        adminEmail: 'admin@example.com',
        contact: 'contact@example.com',
      };

      const rules: RedactionRule[] = [
        {
          id: 'wildcard-rule',
          fieldPattern: '*Email',
          operation: 'hash',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(2);
      expect(result.fields.some((f) => f.fieldName === 'userEmail')).toBe(true);
      expect(result.fields.some((f) => f.fieldName === 'adminEmail')).toBe(
        true,
      );
      expect(result.fields.some((f) => f.fieldName === 'contact')).toBe(false);
    });

    it('should match by field type', async () => {
      const record = {
        userEmail: 'test@example.com',
        otherField: 'not-an-email',
      };

      const rules: RedactionRule[] = [
        {
          id: 'type-rule',
          fieldPattern: '*',
          operation: 'hash',
          storageTargets: ['postgres'],
          conditions: {
            fieldType: 'email',
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].fieldName).toBe('userEmail');
    });

    it('should apply more specific rules first', async () => {
      const record = {
        email: 'test@example.com',
      };

      const rules: RedactionRule[] = [
        {
          id: 'general-rule',
          fieldPattern: '*',
          operation: 'mask',
          storageTargets: ['postgres'],
        },
        {
          id: 'specific-rule',
          fieldPattern: 'email',
          operation: 'hash',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      // Specific rule should be applied (hash, not mask)
      expect(result.fields[0].operation).toBe('hash');
    });
  });

  describe('Provenance and Hash Stubs', () => {
    it('should create hash stubs when requested', async () => {
      const record = {
        ssn: '123-45-6789',
      };

      const rules: RedactionRule[] = [
        {
          id: 'stub-rule',
          fieldPattern: 'ssn',
          operation: 'hash',
          storageTargets: ['postgres'],
          keepHashStub: true,
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
        preserveProvenance: true,
      });

      expect(result.fields[0].hashStub).toBeDefined();
      expect(result.hashStubs.has('ssn')).toBe(true);
    });

    it('should preserve original value when provenance is enabled', async () => {
      const record = {
        name: 'John Doe',
      };

      const rules: RedactionRule[] = [
        {
          id: 'preserve-rule',
          fieldPattern: 'name',
          operation: 'anonymize',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
        preserveProvenance: true,
      });

      expect(result.fields[0].originalValue).toBe('John Doe');
    });
  });

  describe('Bulk Operations', () => {
    it('should redact multiple PostgreSQL records', async () => {
      const mockQuery = pool.query as jest.Mock;
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', email: 'user1@example.com', name: 'User 1' },
          { id: '2', email: 'user2@example.com', name: 'User 2' },
        ],
      });

      const rules: RedactionRule[] = [
        {
          id: 'email-rule',
          fieldPattern: 'email',
          operation: 'hash',
          storageTargets: ['postgres'],
        },
      ];

      const results = await engine.redactPostgresRecords(
        'users',
        ['1', '2'],
        rules,
      );

      expect(results).toHaveLength(2);
      expect(results[0].recordId).toBe('1');
      expect(results[1].recordId).toBe('2');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      const record = {
        email: null,
      };

      const rules: RedactionRule[] = [
        {
          id: 'null-rule',
          fieldPattern: 'email',
          operation: 'hash',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toBe('');
    });

    it('should handle empty rules array', async () => {
      const record = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await engine.redactRecord(record, [], {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(0);
      expect(record.name).toBe('John Doe');
      expect(record.email).toBe('john@example.com');
    });

    it('should handle records with no matching fields', async () => {
      const record = {
        id: 123,
        createdAt: new Date(),
      };

      const rules: RedactionRule[] = [
        {
          id: 'nonmatch-rule',
          fieldPattern: 'nonexistent',
          operation: 'delete',
          storageTargets: ['postgres'],
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(0);
    });

    it('should filter rules by storage system', async () => {
      const record = {
        email: 'test@example.com',
      };

      const rules: RedactionRule[] = [
        {
          id: 'neo4j-rule',
          fieldPattern: 'email',
          operation: 'hash',
          storageTargets: ['neo4j'], // Won't match postgres
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields).toHaveLength(0);
    });
  });

  describe('Format Preservation', () => {
    it('should preserve format when masking phone numbers', async () => {
      const record = {
        phone: '555-123-4567',
      };

      const rules: RedactionRule[] = [
        {
          id: 'phone-rule',
          fieldPattern: 'phone',
          operation: 'mask',
          storageTargets: ['postgres'],
          parameters: {
            maskChar: 'X',
            preserveFormat: true,
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toBe('XXX-XXX-XXXX');
    });

    it('should preserve length when masking', async () => {
      const record = {
        secret: '12345',
      };

      const rules: RedactionRule[] = [
        {
          id: 'length-rule',
          fieldPattern: 'secret',
          operation: 'mask',
          storageTargets: ['postgres'],
          parameters: {
            preserveLength: true,
          },
        },
      ];

      const result = await engine.redactRecord(record, rules, {
        recordId: '123',
        storageSystem: 'postgres',
      });

      expect(result.fields[0].redactedValue).toHaveLength(5);
    });
  });
});
