"use strict";
/**
 * Tests for Model Selection and Routing Logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock the database and registries for unit testing
globals_1.jest.mock('../db/connection.js', () => ({
    db: {
        query: globals_1.jest.fn(),
        getClient: globals_1.jest.fn(),
        transaction: globals_1.jest.fn(),
        healthCheck: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('Routing Condition Evaluation', () => {
    // Test helper function to evaluate conditions
    function evaluateCondition(condition, context) {
        const { field, operator, value } = condition;
        let actualValue;
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
                    return value.includes(actualValue);
                }
                return false;
            case 'not_in':
                if (Array.isArray(value)) {
                    return !value.includes(actualValue);
                }
                return false;
            case 'contains':
                if (Array.isArray(actualValue)) {
                    return actualValue.includes(value);
                }
                return actualValue.includes(value);
            case 'starts_with':
                return actualValue.startsWith(value);
            case 'ends_with':
                return actualValue.endsWith(value);
            case 'regex':
                try {
                    const regex = new RegExp(value);
                    return regex.test(actualValue);
                }
                catch {
                    return false;
                }
            default:
                return false;
        }
    }
    (0, globals_1.describe)('equals operator', () => {
        (0, globals_1.it)('should match exact tenant_id', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'equals',
                value: 'tenant-a',
            };
            const context = { tenantId: 'tenant-a' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
        (0, globals_1.it)('should not match different tenant_id', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'equals',
                value: 'tenant-a',
            };
            const context = { tenantId: 'tenant-b' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(false);
        });
    });
    (0, globals_1.describe)('not_equals operator', () => {
        (0, globals_1.it)('should match when values differ', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'not_equals',
                value: 'tenant-a',
            };
            const context = { tenantId: 'tenant-b' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
    });
    (0, globals_1.describe)('in operator', () => {
        (0, globals_1.it)('should match when value is in list', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'in',
                value: ['tenant-a', 'tenant-b', 'tenant-c'],
            };
            const context = { tenantId: 'tenant-b' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
        (0, globals_1.it)('should not match when value is not in list', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'in',
                value: ['tenant-a', 'tenant-b'],
            };
            const context = { tenantId: 'tenant-c' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(false);
        });
    });
    (0, globals_1.describe)('contains operator', () => {
        (0, globals_1.it)('should match when array contains value', () => {
            const condition = {
                field: 'feature',
                operator: 'contains',
                value: 'beta-feature',
            };
            const context = { featureFlags: ['alpha', 'beta-feature', 'gamma'] };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
        (0, globals_1.it)('should match when string contains substring', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'contains',
                value: 'prod',
            };
            const context = { tenantId: 'tenant-prod-01' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
    });
    (0, globals_1.describe)('starts_with operator', () => {
        (0, globals_1.it)('should match when string starts with prefix', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'starts_with',
                value: 'gov-',
            };
            const context = { tenantId: 'gov-agency-123' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
    });
    (0, globals_1.describe)('regex operator', () => {
        (0, globals_1.it)('should match regex pattern', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'regex',
                value: '^tenant-[a-z]+-\\d+$',
            };
            const context = { tenantId: 'tenant-alpha-123' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(true);
        });
        (0, globals_1.it)('should handle invalid regex gracefully', () => {
            const condition = {
                field: 'tenant_id',
                operator: 'regex',
                value: '[invalid(regex',
            };
            const context = { tenantId: 'tenant-a' };
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(false);
        });
    });
    (0, globals_1.describe)('missing field handling', () => {
        (0, globals_1.it)('should return false for undefined field', () => {
            const condition = {
                field: 'user_id',
                operator: 'equals',
                value: 'user-123',
            };
            const context = { tenantId: 'tenant-a' }; // No userId
            (0, globals_1.expect)(evaluateCondition(condition, context)).toBe(false);
        });
    });
});
(0, globals_1.describe)('Condition Logic', () => {
    function evaluateRule(conditions, conditionLogic, context) {
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
    (0, globals_1.describe)('all logic', () => {
        (0, globals_1.it)('should require all conditions to match', () => {
            const conditions = [
                { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
                { field: 'capability', operator: 'equals', value: 'rag' },
            ];
            const context = { tenantId: 'tenant-a', capability: 'rag' };
            (0, globals_1.expect)(evaluateRule(conditions, 'all', context)).toBe(true);
        });
        (0, globals_1.it)('should fail if any condition does not match', () => {
            const conditions = [
                { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
                { field: 'capability', operator: 'equals', value: 'rag' },
            ];
            const context = { tenantId: 'tenant-a', capability: 'classification' };
            (0, globals_1.expect)(evaluateRule(conditions, 'all', context)).toBe(false);
        });
    });
    (0, globals_1.describe)('any logic', () => {
        (0, globals_1.it)('should match if any condition matches', () => {
            const conditions = [
                { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
                { field: 'tenant_id', operator: 'equals', value: 'tenant-b' },
            ];
            const context = { tenantId: 'tenant-b' };
            (0, globals_1.expect)(evaluateRule(conditions, 'any', context)).toBe(true);
        });
        (0, globals_1.it)('should fail if no conditions match', () => {
            const conditions = [
                { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
                { field: 'tenant_id', operator: 'equals', value: 'tenant-b' },
            ];
            const context = { tenantId: 'tenant-c' };
            (0, globals_1.expect)(evaluateRule(conditions, 'any', context)).toBe(false);
        });
    });
});
(0, globals_1.describe)('Traffic Percentage (Canary)', () => {
    (0, globals_1.it)('should route traffic based on percentage', () => {
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
        (0, globals_1.expect)(routedPercentage).toBeGreaterThan(8);
        (0, globals_1.expect)(routedPercentage).toBeLessThan(12);
    });
    (0, globals_1.it)('should route 0% traffic when set to 0', () => {
        const trafficPercentage = 0;
        let routed = false;
        for (let i = 0; i < 1000; i++) {
            if (Math.random() * 100 < trafficPercentage) {
                routed = true;
                break;
            }
        }
        (0, globals_1.expect)(routed).toBe(false);
    });
    (0, globals_1.it)('should route 100% traffic when set to 100', () => {
        const trafficPercentage = 100;
        let allRouted = true;
        for (let i = 0; i < 100; i++) {
            if (!(Math.random() * 100 < trafficPercentage)) {
                allRouted = false;
                break;
            }
        }
        (0, globals_1.expect)(allRouted).toBe(true);
    });
});
(0, globals_1.describe)('Circuit Breaker State Machine', () => {
    function recordFailure(state, threshold) {
        const newState = { ...state };
        newState.failureCount++;
        newState.lastFailureTime = Date.now();
        if (newState.failureCount >= threshold) {
            newState.state = 'open';
        }
        return newState;
    }
    function recordSuccess(state, successThreshold) {
        const newState = { ...state };
        if (newState.state === 'half-open') {
            newState.successCount++;
            if (newState.successCount >= successThreshold) {
                newState.state = 'closed';
                newState.failureCount = 0;
                newState.successCount = 0;
            }
        }
        else if (newState.state === 'closed') {
            newState.failureCount = 0;
        }
        return newState;
    }
    function tryTransitionToHalfOpen(state, waitDurationMs) {
        if (state.state === 'open') {
            if (Date.now() - state.lastFailureTime > waitDurationMs) {
                return { ...state, state: 'half-open', successCount: 0 };
            }
        }
        return state;
    }
    (0, globals_1.it)('should transition from closed to open after threshold failures', () => {
        let state = {
            state: 'closed',
            failureCount: 0,
            lastFailureTime: 0,
            successCount: 0,
        };
        // Record 9 failures (threshold - 1)
        for (let i = 0; i < 9; i++) {
            state = recordFailure(state, 10);
        }
        (0, globals_1.expect)(state.state).toBe('closed');
        // 10th failure should open the circuit
        state = recordFailure(state, 10);
        (0, globals_1.expect)(state.state).toBe('open');
    });
    (0, globals_1.it)('should transition from open to half-open after wait duration', () => {
        const state = {
            state: 'open',
            failureCount: 10,
            lastFailureTime: Date.now() - 70000, // 70 seconds ago
            successCount: 0,
        };
        const newState = tryTransitionToHalfOpen(state, 60000); // 60 second wait
        (0, globals_1.expect)(newState.state).toBe('half-open');
    });
    (0, globals_1.it)('should transition from half-open to closed after success threshold', () => {
        let state = {
            state: 'half-open',
            failureCount: 10,
            lastFailureTime: Date.now() - 70000,
            successCount: 0,
        };
        // Record 4 successes (threshold - 1)
        for (let i = 0; i < 4; i++) {
            state = recordSuccess(state, 5);
        }
        (0, globals_1.expect)(state.state).toBe('half-open');
        // 5th success should close the circuit
        state = recordSuccess(state, 5);
        (0, globals_1.expect)(state.state).toBe('closed');
        (0, globals_1.expect)(state.failureCount).toBe(0);
    });
    (0, globals_1.it)('should reset failure count on success in closed state', () => {
        let state = {
            state: 'closed',
            failureCount: 5,
            lastFailureTime: Date.now(),
            successCount: 0,
        };
        state = recordSuccess(state, 5);
        (0, globals_1.expect)(state.failureCount).toBe(0);
    });
});
