import { EntityResolutionService, EntityResolutionConfig } from '../EntityResolutionService.js';
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
        url: 'https://WWW.Example.com/Profile'
      };

      const normalized = service.normalizeEntityProperties(entity);

      expect(normalized.name).toBe('john doe');
      expect(normalized.email).toBe('john.doe@example.com');
      expect(normalized.url).toBe('www.example.com/profile');
    });

    it('should handle missing properties', () => {
      const entity = { name: 'John' };
      const normalized = service.normalizeEntityProperties(entity);
      expect(normalized.name).toBe('john');
      expect(normalized.email).toBeUndefined();
    });

    it('should hash email if privacy mode is enabled', () => {
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
    it('should match identical entities with high confidence', () => {
      const entityA = { name: 'Alice', email: 'alice@example.com' };
      const entityB = { name: 'Alice', email: 'alice@example.com' };

      const result = service.evaluateMatch(entityA, entityB);

      expect(result.isMatch).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.explanation).toHaveLength(2); // Name and Email match
      expect(result.explanation.find(e => e.ruleId === 'email_exact')).toBeDefined();
    });

    it('should not match different entities', () => {
      const entityA = { name: 'Alice', email: 'alice@example.com' };
      const entityB = { name: 'Bob', email: 'bob@example.com' };

      const result = service.evaluateMatch(entityA, entityB);

      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe('none');
    });

    it('should return explanation for matches', () => {
       const entityA = { name: 'Alice', email: 'alice@example.com' };
       const entityB = { name: 'Alice Cooper', email: 'alice@example.com' };

       const result = service.evaluateMatch(entityA, entityB);

       // Email matches (score 1.0), Name does not match exactly
       expect(result.isMatch).toBe(true);
       expect(result.explanation[0].ruleId).toBe('email_exact');
    });
  });
});
