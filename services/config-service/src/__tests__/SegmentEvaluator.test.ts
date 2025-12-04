import { SegmentEvaluator } from '../services/SegmentEvaluator.js';
import type { Segment, SegmentRule, EvaluationContext } from '../types/index.js';

describe('SegmentEvaluator', () => {
  let evaluator: SegmentEvaluator;

  beforeEach(() => {
    evaluator = new SegmentEvaluator();
  });

  const createContext = (overrides: Partial<EvaluationContext> = {}): EvaluationContext => ({
    userId: 'user-123',
    tenantId: 'tenant-1',
    environment: 'production',
    attributes: {},
    ...overrides,
  });

  const createSegment = (rules: SegmentRule[]): Segment => ({
    id: 'segment-1',
    name: 'Test Segment',
    description: null,
    tenantId: null,
    rules,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    updatedBy: 'admin',
  });

  describe('evaluateSegment', () => {
    it('should return true for empty rules', () => {
      const segment = createSegment([]);
      const context = createContext();

      expect(evaluator.evaluateSegment(segment, context)).toBe(true);
    });

    it('should return true if any rule matches (OR logic)', () => {
      const segment = createSegment([
        {
          conditions: [
            { attribute: 'tenantId', operator: 'equals', value: 'other-tenant' },
          ],
        },
        {
          conditions: [
            { attribute: 'tenantId', operator: 'equals', value: 'tenant-1' },
          ],
        },
      ]);
      const context = createContext();

      expect(evaluator.evaluateSegment(segment, context)).toBe(true);
    });

    it('should return false if no rules match', () => {
      const segment = createSegment([
        {
          conditions: [
            { attribute: 'tenantId', operator: 'equals', value: 'other-tenant' },
          ],
        },
      ]);
      const context = createContext();

      expect(evaluator.evaluateSegment(segment, context)).toBe(false);
    });
  });

  describe('evaluateRule', () => {
    it('should return true if all conditions match (AND logic)', () => {
      const rule: SegmentRule = {
        conditions: [
          { attribute: 'tenantId', operator: 'equals', value: 'tenant-1' },
          { attribute: 'environment', operator: 'equals', value: 'production' },
        ],
      };
      const context = createContext();

      expect(evaluator.evaluateRule(rule, context)).toBe(true);
    });

    it('should return false if any condition fails', () => {
      const rule: SegmentRule = {
        conditions: [
          { attribute: 'tenantId', operator: 'equals', value: 'tenant-1' },
          { attribute: 'environment', operator: 'equals', value: 'staging' },
        ],
      };
      const context = createContext();

      expect(evaluator.evaluateRule(rule, context)).toBe(false);
    });
  });

  describe('operators', () => {
    describe('equals', () => {
      it('should match equal strings (case insensitive)', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'equals', value: 'USER-123' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });

      it('should match equal numbers', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'attributes.age', operator: 'equals', value: 25 },
          ],
        };
        expect(
          evaluator.evaluateRule(rule, createContext({ attributes: { age: 25 } })),
        ).toBe(true);
      });
    });

    describe('not_equals', () => {
      it('should not match equal values', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'tenantId', operator: 'not_equals', value: 'tenant-1' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(false);
      });

      it('should match different values', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'tenantId', operator: 'not_equals', value: 'other' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });
    });

    describe('contains', () => {
      it('should match substring in string', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'contains', value: 'user' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });

      it('should match element in array', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'attributes.roles', operator: 'contains', value: 'admin' },
          ],
        };
        expect(
          evaluator.evaluateRule(
            rule,
            createContext({ attributes: { roles: ['user', 'admin'] } }),
          ),
        ).toBe(true);
      });
    });

    describe('starts_with', () => {
      it('should match prefix', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'starts_with', value: 'user' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });

      it('should not match non-prefix', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'starts_with', value: '123' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(false);
      });
    });

    describe('ends_with', () => {
      it('should match suffix', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'ends_with', value: '123' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });
    });

    describe('in', () => {
      it('should match value in array', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'tenantId', operator: 'in', value: ['tenant-1', 'tenant-2'] },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });

      it('should not match value not in array', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'tenantId', operator: 'in', value: ['other-1', 'other-2'] },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(false);
      });
    });

    describe('not_in', () => {
      it('should match value not in array', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'tenantId', operator: 'not_in', value: ['other-1', 'other-2'] },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });
    });

    describe('comparison operators', () => {
      it('should evaluate greater_than', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'attributes.score', operator: 'greater_than', value: 50 },
          ],
        };
        expect(
          evaluator.evaluateRule(rule, createContext({ attributes: { score: 75 } })),
        ).toBe(true);
        expect(
          evaluator.evaluateRule(rule, createContext({ attributes: { score: 25 } })),
        ).toBe(false);
      });

      it('should evaluate less_than', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'attributes.score', operator: 'less_than', value: 50 },
          ],
        };
        expect(
          evaluator.evaluateRule(rule, createContext({ attributes: { score: 25 } })),
        ).toBe(true);
      });

      it('should evaluate greater_than_or_equals', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'attributes.score', operator: 'greater_than_or_equals', value: 50 },
          ],
        };
        expect(
          evaluator.evaluateRule(rule, createContext({ attributes: { score: 50 } })),
        ).toBe(true);
      });
    });

    describe('regex', () => {
      it('should match regex pattern', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'regex', value: '^user-\\d+$' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(true);
      });

      it('should not match invalid regex gracefully', () => {
        const rule: SegmentRule = {
          conditions: [
            { attribute: 'userId', operator: 'regex', value: '[invalid' },
          ],
        };
        expect(evaluator.evaluateRule(rule, createContext())).toBe(false);
      });
    });

    describe('semver operators', () => {
      it('should compare semver versions', () => {
        const context = createContext({ attributes: { version: '2.1.0' } });

        expect(
          evaluator.evaluateRule(
            {
              conditions: [
                { attribute: 'attributes.version', operator: 'semver_greater_than', value: '2.0.0' },
              ],
            },
            context,
          ),
        ).toBe(true);

        expect(
          evaluator.evaluateRule(
            {
              conditions: [
                { attribute: 'attributes.version', operator: 'semver_less_than', value: '3.0.0' },
              ],
            },
            context,
          ),
        ).toBe(true);

        expect(
          evaluator.evaluateRule(
            {
              conditions: [
                { attribute: 'attributes.version', operator: 'semver_equals', value: '2.1.0' },
              ],
            },
            context,
          ),
        ).toBe(true);
      });
    });
  });

  describe('nested attributes', () => {
    it('should access nested attributes using dot notation', () => {
      const rule: SegmentRule = {
        conditions: [
          { attribute: 'attributes.user.profile.tier', operator: 'equals', value: 'premium' },
        ],
      };
      const context = createContext({
        attributes: {
          user: {
            profile: {
              tier: 'premium',
            },
          },
        },
      });

      expect(evaluator.evaluateRule(rule, context)).toBe(true);
    });

    it('should return undefined for missing nested paths', () => {
      const rule: SegmentRule = {
        conditions: [
          { attribute: 'attributes.missing.path', operator: 'equals', value: 'value' },
        ],
      };
      const context = createContext();

      expect(evaluator.evaluateRule(rule, context)).toBe(false);
    });
  });
});
