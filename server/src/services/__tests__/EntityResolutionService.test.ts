import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { EntityResolutionService } from '../EntityResolutionService.js';
import { createHash } from 'node:crypto';

describe('EntityResolutionService', () => {
  let service: EntityResolutionService;
  const mockSalt = 'test-salt';

  beforeEach(() => {
    service = new EntityResolutionService({
      privacy: {
        saltedHash: false,
        salt: mockSalt
      }
    });
  });

  describe('normalizeEntityProperties', () => {
    it('should normalize name and email', () => {
      const entity = {
        name: '  John Doe  ',
        email: 'JOHN.DOE@Example.COM ',
      };

      const normalized = service.normalizeEntityProperties(entity);

      expect(normalized.name).toBe('john doe');
      expect(normalized.email).toBe('john.doe@example.com');
    });

    // TODO: Implement URL normalization in EntityResolutionService
    it.skip('should normalize URL', () => {
      const entity = { url: 'https://WWW.Example.com/Profile' };
      const normalized = service.normalizeEntityProperties(entity);
      expect(normalized.url).toBe('www.example.com/profile');
    });

    it('should handle missing properties', () => {
      const entity = { name: 'John' };
      const normalized = service.normalizeEntityProperties(entity);
      expect(normalized.name).toBe('john');
      expect(normalized.email).toBeUndefined();
    });

    // TODO: Implement privacy mode email hashing in EntityResolutionService
    it.skip('should hash email if privacy mode is enabled', () => {
      service = new EntityResolutionService({
        privacy: {
          saltedHash: true,
          salt: mockSalt
        }
      });

      const email = 'john.doe@example.com';
      const expectedHash = createHash('sha256')
        .update(email + mockSalt)
        .digest('hex');

      const normalized = service.normalizeEntityProperties({ email });
      expect(normalized.email).toBe(expectedHash);
    });
  });

  describe('evaluateMatch', () => {
    it('should return high score for matching emails', async () => {
      const entityA = { name: 'Alice', email: 'alice@example.com' };
      const entityB = { name: 'Alice', email: 'alice@example.com' };

      const score = await service.evaluateMatch(entityA, entityB);

      expect(score).toBe(1.0); // Email exact match
    });

    it('should return lower score for matching names only', async () => {
      const entityA = { name: 'Alice', email: 'alice@example.com' };
      const entityB = { name: 'Alice', email: 'different@example.com' };

      const score = await service.evaluateMatch(entityA, entityB);

      expect(score).toBe(0.8); // Name match only
    });

    it('should return zero for non-matching entities', async () => {
      const entityA = { name: 'Alice', email: 'alice@example.com' };
      const entityB = { name: 'Bob', email: 'bob@example.com' };

      const score = await service.evaluateMatch(entityA, entityB);

      expect(score).toBe(0);
    });
  });
});
