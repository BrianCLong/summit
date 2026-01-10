
import { MasterErrorCatalog } from '../catalog.js';
import { CanonicalError } from '../canonical.js';
import { describe, it, expect } from '@jest/globals';

describe('Error Catalog', () => {
  it('should have unique error codes', () => {
    const codes = new Set<string>();
    const duplicates = new Set<string>();

    for (const key of Object.keys(MasterErrorCatalog)) {
      const error = MasterErrorCatalog[key as keyof typeof MasterErrorCatalog];
      if (codes.has(error.code)) {
        duplicates.add(error.code);
      }
      codes.add(error.code);
    }

    expect(duplicates.size).toBe(0);
  });

  it('should have properly formatted error codes (E followed by 4 digits)', () => {
    for (const key of Object.keys(MasterErrorCatalog)) {
      const error = MasterErrorCatalog[key as keyof typeof MasterErrorCatalog];
      expect(error.code).toMatch(/^E\d{4}$/);
    }
  });

  it('should have valid status codes', () => {
    for (const key of Object.keys(MasterErrorCatalog)) {
      const error = MasterErrorCatalog[key as keyof typeof MasterErrorCatalog];
      expect(error.status).toBeGreaterThanOrEqual(400);
      expect(error.status).toBeLessThan(600);
    }
  });

  it('should have remediation steps', () => {
    for (const key of Object.keys(MasterErrorCatalog)) {
      const error = MasterErrorCatalog[key as keyof typeof MasterErrorCatalog];
      expect(error.remediation).toBeTruthy();
      expect(error.remediation.length).toBeGreaterThan(0);
    }
  });
});

describe('CanonicalError', () => {
  it('should be instantiable from catalog key', () => {
    const err = new CanonicalError('AUTH_INVALID_TOKEN');
    expect(err).toBeInstanceOf(CanonicalError);
    expect(err.code).toBe('E1001');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Invalid authentication token provided.');
    expect(err.remediation).toBe('Please refresh your token or log in again.');
  });

  it('should attach details', () => {
    const err = new CanonicalError('VALIDATION_BAD_INPUT', { field: 'email', reason: 'invalid format' });
    expect(err.context.metadata).toEqual({ field: 'email', reason: 'invalid format' });
  });

  it('should serialize correctly', () => {
    const err = new CanonicalError('RESOURCE_NOT_FOUND');
    const json = err.toJSON();
    expect(json).toHaveProperty('code', 'E3001');
    expect(json).toHaveProperty('remediation');
  });
});
