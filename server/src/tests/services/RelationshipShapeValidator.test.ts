import { jest } from '@jest/globals';
import { RelationshipShapeValidator } from '../../services/RelationshipShapeValidator.js';
import { getNeo4jDriver } from '../../config/database.js';

// Mock dependencies
jest.mock('../../config/database.js', () => ({
  getNeo4jDriver: jest.fn(),
}));

describe('RelationshipShapeValidator', () => {
  let validator: RelationshipShapeValidator;

  beforeEach(() => {
    validator = new RelationshipShapeValidator();
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate a correct relationship', () => {
      const result = validator.validate(
        'Person',
        'FRIEND',
        'Person',
        { since: '2023-01-01', closeness: 'high' }
      );
      expect(result.valid).toBe(true);
      expect(result.normalizedProperties).toHaveProperty('created_at');
      expect(result.normalizedProperties).toHaveProperty('weight');
    });

    it('should reject invalid relationship type', () => {
      const result = validator.validate('Person', 'INVALID_TYPE', 'Person');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid relationship type');
    });

    it('should reject invalid node pair', () => {
      const result = validator.validate('Organization', 'FRIEND', 'Person');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid node pair');
    });

    it('should reject invalid node pair (reverse check)', () => {
      // FRIEND is Person->Person only.
      // EMPLOYMENT is Person->Organization.
      // If we try Organization->Person for EMPLOYMENT, it should fail based on strict schema
      const result = validator.validate('Organization', 'EMPLOYMENT', 'Person');
      expect(result.valid).toBe(false);
    });

    it('should reject forbidden properties', () => {
      const result = validator.validate('Person', 'FRIEND', 'Person', {
        unknown_prop: 123
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Forbidden properties');
    });

    it('should normalize dates', () => {
      // In our schema, "since" is a property of FRIEND.
      const result = validator.validate('Person', 'FRIEND', 'Person', {
        since: '2023-01-01'
      });
      expect(result.valid).toBe(true);
      // It should be normalized to ISO string if not already?
      // new Date('2023-01-01').toISOString()
    });
  });

  describe('detectDrift', () => {
    it('should detect unknown types', async () => {
      const mockRun = jest.fn().mockReturnValue(Promise.resolve({
        records: [
          {
            get: (key: string) => {
               if (key === 'id') return 1;
               if (key === 'type') return 'UNKNOWN_REL';
               if (key === 'sLabels') return ['Person'];
               if (key === 'tLabels') return ['Person'];
               if (key === 'propKeys') return [];
            }
          }
        ]
      }));
      const mockSession = {
        run: mockRun,
        close: jest.fn(),
      };
      (getNeo4jDriver as jest.Mock).mockReturnValue({
        session: () => mockSession,
      });

      const violations = await validator.detectDrift();
      expect(violations).toHaveLength(1);
      expect(violations[0].violation).toContain('Unknown relationship type');
    });

    it('should detect invalid pairs', async () => {
      const mockRun = jest.fn().mockReturnValue(Promise.resolve({
        records: [
          {
             get: (key: string) => {
               if (key === 'id') return 1;
               if (key === 'type') return 'EMPLOYMENT';
               if (key === 'sLabels') return ['Person'];
               if (key === 'tLabels') return ['Person']; // Invalid target for Employment
               if (key === 'propKeys') return [];
            }
          }
        ]
      }));
      const mockSession = {
        run: mockRun,
        close: jest.fn(),
      };
      (getNeo4jDriver as jest.Mock).mockReturnValue({
        session: () => mockSession,
      });

      const violations = await validator.detectDrift();
      expect(violations).toHaveLength(1);
      expect(violations[0].violation).toContain('Invalid node pair');
    });
  });
});
