/**
 * Tests for Model Selection and Routing Logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  RoutingCondition,
  ModelCapability,
} from '../types/index.js';

// Mock the database and registries for unit testing
jest.mock('../db/connection.js', () => ({
  db: {
    query: jest.fn(),
    getClient: jest.fn(),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

describe('Routing Condition Evaluation', () => {
  // Test helper function to evaluate conditions
  function evaluateCondition(
    condition: RoutingCondition,
    context: Record<string, unknown>,
  ): boolean {
    const { field, operator, value } = condition;

    let actualValue: unknown;
    switch (field) {
      case 'tenant_id':
        actualValue = context.tenantId;
        break;
      case 'user_id':
        actualValue = context.userId;
        break;
      case 'capability':
        actualValue = context.capability;
        break;
      case 'feature':
        actualValue = context.featureFlags;
        break;
      default:
        return false;
    }

    if (actualValue === undefined) {
      return false;
    }

    switch (operator) {
      case 'equals':
        return actualValue === value;
      case 'not_equals':
        return actualValue !== value;
      case 'in':
        if (Array.isArray(value)) {
          return value.includes(actualValue as string);
        }
        return false;
      case 'not_in':
        if (Array.isArray(value)) {
          return !value.includes(actualValue as string);
        }
        return false;
      case 'contains':
        if (Array.isArray(actualValue)) {
          return actualValue.includes(value as string);
        }
        return (actualValue as string).includes(value as string);
      case 'starts_with':
        return (actualValue as string).startsWith(value as string);
      case 'ends_with':
        return (actualValue as string).endsWith(value as string);
      case 'regex':
        try {
          const regex = new RegExp(value as string);
          return regex.test(actualValue as string);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  describe('equals operator', () => {
    it('should match exact tenant_id', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'equals',
        value: 'tenant-a',
      };
      const context = { tenantId: 'tenant-a' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should not match different tenant_id', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'equals',
        value: 'tenant-a',
      };
      const context = { tenantId: 'tenant-b' };

      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe('not_equals operator', () => {
    it('should match when values differ', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'not_equals',
        value: 'tenant-a',
      };
      const context = { tenantId: 'tenant-b' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });
  });

  describe('in operator', () => {
    it('should match when value is in list', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'in',
        value: ['tenant-a', 'tenant-b', 'tenant-c'],
      };
      const context = { tenantId: 'tenant-b' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should not match when value is not in list', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'in',
        value: ['tenant-a', 'tenant-b'],
      };
      const context = { tenantId: 'tenant-c' };

      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('should match when array contains value', () => {
      const condition: RoutingCondition = {
        field: 'feature',
        operator: 'contains',
        value: 'beta-feature',
      };
      const context = { featureFlags: ['alpha', 'beta-feature', 'gamma'] };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should match when string contains substring', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'contains',
        value: 'prod',
      };
      const context = { tenantId: 'tenant-prod-01' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });
  });

  describe('starts_with operator', () => {
    it('should match when string starts with prefix', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'starts_with',
        value: 'gov-',
      };
      const context = { tenantId: 'gov-agency-123' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });
  });

  describe('regex operator', () => {
    it('should match regex pattern', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'regex',
        value: '^tenant-[a-z]+-\\d+$',
      };
      const context = { tenantId: 'tenant-alpha-123' };

      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should handle invalid regex gracefully', () => {
      const condition: RoutingCondition = {
        field: 'tenant_id',
        operator: 'regex',
        value: '[invalid(regex',
      };
      const context = { tenantId: 'tenant-a' };

      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe('missing field handling', () => {
    it('should return false for undefined field', () => {
      const condition: RoutingCondition = {
        field: 'user_id',
        operator: 'equals',
        value: 'user-123',
      };
      const context = { tenantId: 'tenant-a' }; // No userId

      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });
});

describe('Condition Logic', () => {
  function evaluateRule(
    conditions: RoutingCondition[],
    conditionLogic: 'all' | 'any',
    context: Record<string, unknown>,
  ): boolean {
    const results = conditions.map((c) => {
      // Simplified evaluation for testing
      if (c.field === 'tenant_id' && c.operator === 'equals') {
        return context.tenantId === c.value;
      }
      if (c.field === 'capability' && c.operator === 'equals') {
        return context.capability === c.value;
      }
      return false;
    });

    if (conditionLogic === 'all') {
      return results.every((r) => r);
    }
    return results.some((r) => r);
  }

  describe('all logic', () => {
    it('should require all conditions to match', () => {
      const conditions: RoutingCondition[] = [
        { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
        { field: 'capability', operator: 'equals', value: 'rag' },
      ];
      const context = { tenantId: 'tenant-a', capability: 'rag' };

      expect(evaluateRule(conditions, 'all', context)).toBe(true);
    });

    it('should fail if any condition does not match', () => {
      const conditions: RoutingCondition[] = [
        { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
        { field: 'capability', operator: 'equals', value: 'rag' },
      ];
      const context = { tenantId: 'tenant-a', capability: 'classification' };

      expect(evaluateRule(conditions, 'all', context)).toBe(false);
    });
  });

  describe('any logic', () => {
    it('should match if any condition matches', () => {
      const conditions: RoutingCondition[] = [
        { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
        { field: 'tenant_id', operator: 'equals', value: 'tenant-b' },
      ];
      const context = { tenantId: 'tenant-b' };

      expect(evaluateRule(conditions, 'any', context)).toBe(true);
    });

    it('should fail if no conditions match', () => {
      const conditions: RoutingCondition[] = [
        { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
        { field: 'tenant_id', operator: 'equals', value: 'tenant-b' },
      ];
      const context = { tenantId: 'tenant-c' };

      expect(evaluateRule(conditions, 'any', context)).toBe(false);
    });
  });
});

describe('Traffic Percentage (Canary)', () => {
  it('should route traffic based on percentage', () => {
    const trafficPercentage = 10;
    const iterations = 10000;
    let routed = 0;

    for (let i = 0; i < iterations; i++) {
      if (Math.random() * 100 < trafficPercentage) {
        routed++;
      }
    }

    // Should be roughly 10% with some tolerance
    const routedPercentage = (routed / iterations) * 100;
    expect(routedPercentage).toBeGreaterThan(8);
    expect(routedPercentage).toBeLessThan(12);
  });

  it('should route 0% traffic when set to 0', () => {
    const trafficPercentage = 0;
    let routed = false;

    for (let i = 0; i < 1000; i++) {
      if (Math.random() * 100 < trafficPercentage) {
        routed = true;
        break;
      }
    }

    expect(routed).toBe(false);
  });

  it('should route 100% traffic when set to 100', () => {
    const trafficPercentage = 100;
    let allRouted = true;

    for (let i = 0; i < 100; i++) {
      if (!(Math.random() * 100 < trafficPercentage)) {
        allRouted = false;
        break;
      }
    }

    expect(allRouted).toBe(true);
  });
});

describe('Circuit Breaker State Machine', () => {
  interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  }

  function recordFailure(
    state: CircuitBreakerState,
    threshold: number,
  ): CircuitBreakerState {
    const newState = { ...state };
    newState.failureCount++;
    newState.lastFailureTime = Date.now();

    if (newState.failureCount >= threshold) {
      newState.state = 'open';
    }

    return newState;
  }

  function recordSuccess(
    state: CircuitBreakerState,
    successThreshold: number,
  ): CircuitBreakerState {
    const newState = { ...state };

    if (newState.state === 'half-open') {
      newState.successCount++;
      if (newState.successCount >= successThreshold) {
        newState.state = 'closed';
        newState.failureCount = 0;
        newState.successCount = 0;
      }
    } else if (newState.state === 'closed') {
      newState.failureCount = 0;
    }

    return newState;
  }

  function tryTransitionToHalfOpen(
    state: CircuitBreakerState,
    waitDurationMs: number,
  ): CircuitBreakerState {
    if (state.state === 'open') {
      if (Date.now() - state.lastFailureTime > waitDurationMs) {
        return { ...state, state: 'half-open', successCount: 0 };
      }
    }
    return state;
  }

  it('should transition from closed to open after threshold failures', () => {
    let state: CircuitBreakerState = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
    };

    // Record 9 failures (threshold - 1)
    for (let i = 0; i < 9; i++) {
      state = recordFailure(state, 10);
    }
    expect(state.state).toBe('closed');

    // 10th failure should open the circuit
    state = recordFailure(state, 10);
    expect(state.state).toBe('open');
  });

  it('should transition from open to half-open after wait duration', () => {
    const state: CircuitBreakerState = {
      state: 'open',
      failureCount: 10,
      lastFailureTime: Date.now() - 70000, // 70 seconds ago
      successCount: 0,
    };

    const newState = tryTransitionToHalfOpen(state, 60000); // 60 second wait
    expect(newState.state).toBe('half-open');
  });

  it('should transition from half-open to closed after success threshold', () => {
    let state: CircuitBreakerState = {
      state: 'half-open',
      failureCount: 10,
      lastFailureTime: Date.now() - 70000,
      successCount: 0,
    };

    // Record 4 successes (threshold - 1)
    for (let i = 0; i < 4; i++) {
      state = recordSuccess(state, 5);
    }
    expect(state.state).toBe('half-open');

    // 5th success should close the circuit
    state = recordSuccess(state, 5);
    expect(state.state).toBe('closed');
    expect(state.failureCount).toBe(0);
  });

  it('should reset failure count on success in closed state', () => {
    let state: CircuitBreakerState = {
      state: 'closed',
      failureCount: 5,
      lastFailureTime: Date.now(),
      successCount: 0,
    };

    state = recordSuccess(state, 5);
    expect(state.failureCount).toBe(0);
  });
});
