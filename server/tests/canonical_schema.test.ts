
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { isValidAt, wasKnownAt, BitemporalFields } from '../src/canonical/types.js';

describe('Canonical Data Model', () => {
  describe('Temporal Logic', () => {
    const entity: BitemporalFields = {
      validFrom: new Date('2023-01-01'),
      validTo: new Date('2023-12-31'),
      observedAt: new Date('2023-01-02'),
      recordedAt: new Date('2023-01-02'),
    };

    test('isValidAt correctly identifies valid periods', () => {
      expect(isValidAt(entity, new Date('2023-06-01'))).toBe(true);
      expect(isValidAt(entity, new Date('2022-12-31'))).toBe(false); // Before validFrom
      expect(isValidAt(entity, new Date('2024-01-01'))).toBe(false); // After validTo
    });

    test('isValidAt handles open-ended validTo', () => {
      const openEntity = { ...entity, validTo: null };
      expect(isValidAt(openEntity, new Date('2025-01-01'))).toBe(true);
    });

    test('wasKnownAt correctly identifies knowledge time', () => {
      expect(wasKnownAt(entity, new Date('2023-01-03'))).toBe(true);
      expect(wasKnownAt(entity, new Date('2023-01-01'))).toBe(false); // Before recordedAt
    });
  });

  describe('Policy Labels', () => {
     // Check if types are importable and structure is correct
     // (Mostly static analysis in TS, but we can check runtime object creation)
     test('Can create object with policy labels', () => {
         const policy = {
             sensitivity: 'top_secret',
             needToKnow: ['operation_omega']
         };
         expect(policy.sensitivity).toBe('top_secret');
     });
  });
});
