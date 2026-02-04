/**
 * Targeting Utilities Tests
 */

import {
  evaluateCondition,
  evaluateRule,
  targetUserId,
  targetRole,
  targetEnvironment,
} from '../utils/targeting';
import type { FlagContext, TargetingRule } from '../types';

describe('Targeting Utilities', () => {
  const context: FlagContext = {
    userId: 'user-123',
    userEmail: 'user@example.com',
    userRole: 'admin',
    tenantId: 'tenant-1',
    environment: 'production',
    attributes: {
      plan: 'premium',
      accountAge: 90,
    },
  };

  describe('evaluateCondition', () => {
    it('should evaluate equals operator', () => {
      const condition = {
        attribute: 'userId',
        operator: 'equals' as const,
        value: 'user-123',
      };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should evaluate not_equals operator', () => {
      const condition = {
        attribute: 'userId',
        operator: 'not_equals' as const,
        value: 'user-456',
      };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should evaluate in operator', () => {
      const condition = {
        attribute: 'userId',
        operator: 'in' as const,
        value: ['user-123', 'user-456'],
      };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should evaluate greater_than operator', () => {
      const condition = {
        attribute: 'accountAge',
        operator: 'greater_than' as const,
        value: 30,
      };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should evaluate contains operator', () => {
      const condition = {
        attribute: 'userEmail',
        operator: 'contains' as const,
        value: '@example.com',
      };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should handle negation', () => {
      const condition = {
        attribute: 'userId',
        operator: 'equals' as const,
        value: 'user-123',
        negate: true,
      };

      expect(evaluateCondition(condition, context)).toBe(false);
    });

    it('should return false for missing attributes', () => {
      const condition = {
        attribute: 'missingAttr',
        operator: 'equals' as const,
        value: 'test',
      };

      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe('evaluateRule', () => {
    it('should evaluate rule with all conditions true', () => {
      const rule: TargetingRule = {
        id: 'test-rule',
        conditions: [
          { attribute: 'userId', operator: 'equals', value: 'user-123' },
          { attribute: 'environment', operator: 'equals', value: 'production' },
        ],
        variation: 'enabled',
      };

      expect(evaluateRule(rule, context)).toBe(true);
    });

    it('should fail rule if any condition is false', () => {
      const rule: TargetingRule = {
        id: 'test-rule',
        conditions: [
          { attribute: 'userId', operator: 'equals', value: 'user-123' },
          { attribute: 'environment', operator: 'equals', value: 'staging' },
        ],
        variation: 'enabled',
      };

      expect(evaluateRule(rule, context)).toBe(false);
    });
  });

  describe('helper functions', () => {
    it('should create userId targeting condition', () => {
      const condition = targetUserId(['user-1', 'user-2']);

      expect(condition).toEqual({
        attribute: 'userId',
        operator: 'in',
        value: ['user-1', 'user-2'],
        negate: false,
      });
    });

    it('should create role targeting condition', () => {
      const condition = targetRole(['admin', 'moderator']);

      expect(condition).toEqual({
        attribute: 'userRole',
        operator: 'in',
        value: ['admin', 'moderator'],
        negate: false,
      });
    });

    it('should create environment targeting condition', () => {
      const condition = targetEnvironment(['production']);

      expect(condition).toEqual({
        attribute: 'environment',
        operator: 'in',
        value: ['production'],
        negate: false,
      });
    });
  });
});
