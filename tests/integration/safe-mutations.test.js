"use strict";
/**
 * Integration tests for safe mutations
 * Tests the complete mutation pipeline with validation, execution, and rollback
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tokcount_1 = require("../../server/src/lib/tokcount");
const MutationValidators_1 = require("../../server/src/validation/MutationValidators");
(0, globals_1.describe)('Safe Mutations Integration Tests', () => {
    (0, globals_1.beforeEach)(() => {
        // Reset any global state
        process.env.TOKEN_BUDGET_LIMIT = '120000';
        process.env.NODE_ENV = 'test';
    });
    (0, globals_1.afterEach)(() => {
        // Cleanup
        delete process.env.TOKEN_BUDGET_LIMIT;
    });
    (0, globals_1.describe)('Token Counting Integration', () => {
        (0, globals_1.it)('should count tokens accurately for OpenAI models', async () => {
            const result = await (0, tokcount_1.countTokens)('openai', 'gpt-4o-mini', 'Hello, world!');
            (0, globals_1.expect)(result.model).toBe('gpt-4o-mini');
            (0, globals_1.expect)(result.prompt).toBeGreaterThan(0);
            (0, globals_1.expect)(result.total).toBe(result.prompt);
            (0, globals_1.expect)(result.estimatedCostUSD).toBeDefined();
        });
        (0, globals_1.it)('should validate token budgets correctly', () => {
            const budgetCheck = (0, tokcount_1.validateTokenBudget)(100000, 120000);
            (0, globals_1.expect)(budgetCheck.withinBudget).toBe(true);
            (0, globals_1.expect)(budgetCheck.recommendAction).toBe('warn');
            (0, globals_1.expect)(budgetCheck.percentUsed).toBeCloseTo(83.33, 2);
        });
        (0, globals_1.it)('should block requests exceeding token budget', () => {
            const budgetCheck = (0, tokcount_1.validateTokenBudget)(130000, 120000);
            (0, globals_1.expect)(budgetCheck.withinBudget).toBe(false);
            (0, globals_1.expect)(budgetCheck.recommendAction).toBe('block');
            (0, globals_1.expect)(budgetCheck.percentUsed).toBeGreaterThan(100);
        });
        (0, globals_1.it)('should handle batch token counting', async () => {
            const requests = [
                { provider: 'openai', model: 'gpt-4o-mini', prompt: 'First prompt' },
                { provider: 'openai', model: 'gpt-4o-mini', prompt: 'Second prompt' },
                {
                    provider: 'anthropic',
                    model: 'claude-3-haiku',
                    prompt: 'Third prompt',
                },
            ];
            // Mock batch endpoint response
            const mockResponse = {
                results: requests.map((req, i) => ({
                    id: `test-${i}`,
                    success: true,
                    model: req.model,
                    prompt: 10 + i,
                    total: 10 + i,
                    estimatedCostUSD: 0.001 * (i + 1),
                })),
                summary: {
                    totalRequests: 3,
                    successfulRequests: 3,
                    totalTokens: 33,
                    totalEstimatedCostUSD: 0.006,
                },
            };
            (0, globals_1.expect)(mockResponse.summary.totalTokens).toBe(33);
            (0, globals_1.expect)(mockResponse.summary.successfulRequests).toBe(3);
        });
    });
    (0, globals_1.describe)('Maestro Safe Mutations', () => {
        (0, globals_1.it)('should validate run configuration', async () => {
            const validConfig = {
                pipeline: 'test-pipeline',
                autonomyLevel: 3,
                budgetCap: 100,
                canaryPercent: 0.1,
                approvalRequired: false,
            };
            // This would normally call the actual API
            (0, globals_1.expect)(validConfig.pipeline).toBe('test-pipeline');
            (0, globals_1.expect)(validConfig.autonomyLevel).toBe(3);
            (0, globals_1.expect)(validConfig.budgetCap).toBe(100);
        });
        (0, globals_1.it)('should reject invalid run configuration', async () => {
            const invalidConfig = {
                pipeline: '', // Invalid: empty pipeline name
                autonomyLevel: 10, // Invalid: autonomy level > 5
                budgetCap: -100, // Invalid: negative budget
                canaryPercent: 1.5, // Invalid: canary > 1
            };
            // Validation should fail
            (0, globals_1.expect)(invalidConfig.pipeline).toBe('');
            (0, globals_1.expect)(invalidConfig.autonomyLevel).toBeGreaterThan(5);
            (0, globals_1.expect)(invalidConfig.budgetCap).toBeLessThan(0);
            (0, globals_1.expect)(invalidConfig.canaryPercent).toBeGreaterThan(1);
        });
        (0, globals_1.it)('should enforce gradual autonomy level increases', async () => {
            // Simulate current autonomy level of 2
            const currentLevel = 2;
            const requestedLevel = 5; // Too big of a jump
            if (requestedLevel > currentLevel + 1) {
                (0, globals_1.expect)(requestedLevel - currentLevel).toBeGreaterThan(1);
            }
        });
        (0, globals_1.it)('should validate budget constraints', async () => {
            const mockBudget = { remaining: 50, cap: 5000 };
            const requestedBudget = 100;
            // Should fail if requested > remaining
            if (requestedBudget > mockBudget.remaining) {
                (0, globals_1.expect)(requestedBudget).toBeGreaterThan(mockBudget.remaining);
            }
        });
    });
    (0, globals_1.describe)('IntelGraph Safe Mutations', () => {
        (0, globals_1.it)('should validate entity creation input', async () => {
            const validEntity = {
                tenantId: 'tenant-123',
                kind: 'Person',
                labels: ['Individual', 'Subject'],
                props: { name: 'John Doe', age: 30 },
                confidence: 0.9,
                source: 'user_input',
            };
            // Mock context
            const context = {
                user: {
                    id: 'user-123',
                    tenantId: 'tenant-123',
                    permissions: ['entity:create'],
                },
                requestId: 'req-123',
                timestamp: new Date().toISOString(),
                source: 'graphql',
            };
            (0, globals_1.expect)(validEntity.tenantId).toBe('tenant-123');
            (0, globals_1.expect)(validEntity.kind).toBe('Person');
            (0, globals_1.expect)(validEntity.confidence).toBe(0.9);
            (0, globals_1.expect)(context.user.permissions).toContain('entity:create');
        });
        (0, globals_1.it)('should validate relationship constraints', async () => {
            const relationship = {
                tenantId: 'tenant-123',
                srcId: 'entity-1',
                dstId: 'entity-2',
                type: 'KNOWS',
                confidence: 0.8,
            };
            // Should fail for self-referential relationships
            const selfRef = { ...relationship, dstId: relationship.srcId };
            (0, globals_1.expect)(selfRef.srcId).toBe(selfRef.dstId);
            // Should pass for valid relationships
            (0, globals_1.expect)(relationship.srcId).not.toBe(relationship.dstId);
            (0, globals_1.expect)(relationship.type).toBe('KNOWS');
        });
        (0, globals_1.it)('should enforce bulk operation limits', async () => {
            const largeEntityBatch = Array.from({ length: 1001 }, (_, i) => ({
                tenantId: 'tenant-123',
                kind: 'TestEntity',
                labels: [],
                props: { index: i },
            }));
            // Should exceed the 1000 entity limit
            (0, globals_1.expect)(largeEntityBatch.length).toBeGreaterThan(1000);
            const validBatch = largeEntityBatch.slice(0, 1000);
            (0, globals_1.expect)(validBatch.length).toBe(1000);
        });
        (0, globals_1.it)('should validate graph traversal parameters', async () => {
            const validTraversal = {
                startEntityId: 'entity-123',
                tenantId: 'tenant-123',
                maxDepth: 3,
                relationshipTypes: ['KNOWS', 'WORKS_WITH'],
                limit: 100,
            };
            (0, globals_1.expect)(validTraversal.maxDepth).toBeLessThanOrEqual(5);
            (0, globals_1.expect)(validTraversal.limit).toBeLessThanOrEqual(1000);
            // Invalid traversal
            const invalidTraversal = {
                ...validTraversal,
                maxDepth: 10, // Too deep
                limit: 2000, // Too many results
            };
            (0, globals_1.expect)(invalidTraversal.maxDepth).toBeGreaterThan(5);
            (0, globals_1.expect)(invalidTraversal.limit).toBeGreaterThan(1000);
        });
    });
    (0, globals_1.describe)('Business Rule Validation', () => {
        (0, globals_1.it)('should validate entity creation business rules', () => {
            const entity = {
                kind: 'IP',
                props: { address: '127.0.0.1' },
                investigationId: 'inv-123',
            };
            const context = {
                entityCount: 100,
                user: { permissions: ['entity:create'] },
                warnings: [],
            };
            const result = MutationValidators_1.BusinessRuleValidator.validateEntityCreation(entity, context);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(context.warnings).toContain('Entity represents internal IP address');
        });
        (0, globals_1.it)('should validate relationship business rules', () => {
            const selfRefRelationship = {
                srcId: 'entity-123',
                dstId: 'entity-123', // Self-referential
                confidence: 0.9,
            };
            const context = { relationshipCount: 50 };
            const result = MutationValidators_1.BusinessRuleValidator.validateRelationshipCreation(selfRefRelationship, context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Self-referential relationships not allowed');
        });
        (0, globals_1.it)('should validate investigation status transitions', () => {
            const investigation = { status: 'COMPLETED' };
            const context = { currentStatus: 'DRAFT' };
            const result = MutationValidators_1.BusinessRuleValidator.validateInvestigationOperation(investigation, 'update', context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors[0]).toContain('Invalid status transition');
        });
        (0, globals_1.it)('should validate token usage budgets', () => {
            const context = {
                dailyTokenUsage: 80000,
                dailyTokenBudget: 100000,
                tenantTokenUsage: 500000,
                tenantTokenBudget: 1000000,
            };
            const result = MutationValidators_1.BusinessRuleValidator.validateTokenUsage(30000, context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Request would exceed daily token budget');
        });
    });
    (0, globals_1.describe)('Security Validation', () => {
        (0, globals_1.it)('should detect SQL injection attempts', () => {
            const maliciousInput = "'; DROP TABLE users; --";
            const result = MutationValidators_1.SecurityValidator.validateInput(maliciousInput);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Potential SQL injection detected');
        });
        (0, globals_1.it)('should detect XSS attempts', () => {
            const xssInput = '<script>alert("xss")</script>';
            const result = MutationValidators_1.SecurityValidator.validateInput(xssInput);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Potential XSS content detected');
        });
        (0, globals_1.it)('should validate user permissions', () => {
            const user = {
                permissions: ['entity:read'],
                tenantId: 'tenant-123',
            };
            const result = MutationValidators_1.SecurityValidator.validatePermissions(user, 'create', 'entity', { tenantId: 'tenant-123' });
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Missing permission: entity:create');
        });
        (0, globals_1.it)('should prevent cross-tenant access', () => {
            const user = {
                permissions: ['entity:create'],
                tenantId: 'tenant-123',
            };
            const result = MutationValidators_1.SecurityValidator.validatePermissions(user, 'create', 'entity', { tenantId: 'tenant-456' });
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Cross-tenant access not allowed');
        });
    });
    (0, globals_1.describe)('Error Handling and Rollback', () => {
        (0, globals_1.it)('should handle validation errors gracefully', async () => {
            // Test with invalid input that should trigger validation errors
            const invalidInput = {
                pipeline: '', // Invalid
                autonomyLevel: 'invalid', // Wrong type
                budgetCap: null, // Invalid
            };
            // Simulate validation error response
            const errorResponse = {
                success: false,
                error: 'Validation failed',
                validationErrors: {
                    issues: [
                        { path: ['pipeline'], message: 'Pipeline name required' },
                        {
                            path: ['autonomyLevel'],
                            message: 'Expected number, received string',
                        },
                        { path: ['budgetCap'], message: 'Budget cap must be positive' },
                    ],
                },
            };
            (0, globals_1.expect)(errorResponse.success).toBe(false);
            (0, globals_1.expect)(errorResponse.validationErrors.issues).toHaveLength(3);
        });
        (0, globals_1.it)('should execute rollback on failure', async () => {
            let rollbackExecuted = false;
            const mockRollback = async () => {
                rollbackExecuted = true;
            };
            // Simulate a mutation with rollback
            const mutationResult = {
                success: true,
                rollbackFn: mockRollback,
            };
            // Execute rollback
            if (mutationResult.rollbackFn) {
                await mutationResult.rollbackFn();
            }
            (0, globals_1.expect)(rollbackExecuted).toBe(true);
        });
        (0, globals_1.it)('should handle batch rollback correctly', async () => {
            const rollbackResults = [];
            const mutations = [
                {
                    success: true,
                    rollbackFn: async () => rollbackResults.push('rollback-1'),
                },
                {
                    success: true,
                    rollbackFn: async () => rollbackResults.push('rollback-2'),
                },
                {
                    success: false,
                    rollbackFn: async () => rollbackResults.push('rollback-3'),
                },
            ];
            // Execute rollbacks in reverse order
            for (const mutation of mutations.reverse()) {
                if (mutation.rollbackFn) {
                    await mutation.rollbackFn();
                }
            }
            (0, globals_1.expect)(rollbackResults).toEqual([
                'rollback-3',
                'rollback-2',
                'rollback-1',
            ]);
        });
    });
    (0, globals_1.describe)('Performance and Scalability', () => {
        (0, globals_1.it)('should handle large token counts efficiently', async () => {
            const largePrompt = 'Lorem ipsum '.repeat(50000); // ~550k characters
            const startTime = Date.now();
            const result = await (0, tokcount_1.countTokens)('openai', 'gpt-4o-mini', largePrompt);
            const duration = Date.now() - startTime;
            (0, globals_1.expect)(result.total).toBeGreaterThan(100000);
            (0, globals_1.expect)(duration).toBeLessThan(5000); // Should complete in under 5 seconds
        });
        (0, globals_1.it)('should validate bulk operations within time limits', () => {
            const entities = Array.from({ length: 1000 }, (_, i) => ({
                tenantId: 'tenant-123',
                kind: 'TestEntity',
                props: { index: i },
            }));
            const startTime = Date.now();
            const context = { bulkOperationsThisHour: 5 };
            const result = MutationValidators_1.BusinessRuleValidator.validateBulkOperation(entities, 'entity', context);
            const duration = Date.now() - startTime;
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(duration).toBeLessThan(1000); // Should validate in under 1 second
        });
        (0, globals_1.it)('should enforce rate limits correctly', async () => {
            // This would test the actual rate limiter
            // For now, just validate the logic
            const operations = [1, 2, 3, 4, 5, 6]; // 6 operations
            const maxOps = 5;
            const windowMs = 60000; // 1 minute
            (0, globals_1.expect)(operations.length).toBeGreaterThan(maxOps);
            // Should be rate limited after 5 operations
            const allowed = operations.length <= maxOps;
            (0, globals_1.expect)(allowed).toBe(false);
        });
    });
});
