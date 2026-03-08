"use strict";
// @ts-nocheck
/**
 * Integration tests for GraphQL Cost Plugin
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const server_1 = require("@apollo/server");
const schema_1 = require("@graphql-tools/schema");
const graphqlCostPlugin_js_1 = require("../graphqlCostPlugin.js");
const CostCalculator_js_1 = require("../../services/CostCalculator.js");
// Mock cost calculator
globals_1.jest.mock('../../services/CostCalculator.js', () => {
    const actualModule = globals_1.jest.requireActual('../../services/CostCalculator.js');
    return {
        ...actualModule,
        getCostCalculator: globals_1.jest.fn(),
    };
});
// Mock rate limiter service
globals_1.jest.mock('../../services/TenantRateLimitService.js', () => ({
    getTenantRateLimitService: globals_1.jest.fn(),
}));
// Mock metrics
globals_1.jest.mock('../../../monitoring/metrics.js', () => ({
    graphqlQueryCostHistogram: {
        labels: globals_1.jest.fn(() => ({ observe: globals_1.jest.fn() })),
    },
    graphqlCostLimitExceededTotal: {
        labels: globals_1.jest.fn(() => ({ inc: globals_1.jest.fn() })),
    },
    graphqlCostLimitRemaining: {
        labels: globals_1.jest.fn(() => ({ set: globals_1.jest.fn() })),
    },
    graphqlTenantCostUsage: {
        labels: globals_1.jest.fn(() => ({ inc: globals_1.jest.fn() })),
    },
    graphqlCostRateLimitHits: {
        labels: globals_1.jest.fn(() => ({ inc: globals_1.jest.fn() })),
    },
    graphqlPerTenantOverageCount: {
        labels: globals_1.jest.fn(() => ({ inc: globals_1.jest.fn() })),
    },
}));
const testConfig = {
    version: '1.0.0',
    defaultCosts: {
        baseField: 1,
        baseListItem: 1,
        baseNestedLevel: 2,
    },
    typeCosts: {
        Query: {
            test: 100,
            expensive: 2000,
        },
    },
    operationCosts: {
        listMultipliers: { default: 1, withLimit: { costPerItem: 1, maxLimit: 100 } },
        nestedMultipliers: {},
        argumentMultipliers: { depth: {} },
    },
    tenantTiers: {
        free: {
            maxCostPerQuery: 500,
            maxCostPerMinute: 5000,
            maxCostPerHour: 50000,
            burstMultiplier: 1.2,
        },
    },
    tenantOverrides: {},
    userRoleLimits: {},
};
const typeDefs = `
  type Query {
    test: String
    expensive: String
  }
`;
const resolvers = {
    Query: {
        test: () => 'test',
        expensive: () => 'expensive',
    },
};
(0, globals_1.describe)('GraphQL Cost Plugin Integration', () => {
    let server;
    let mockCostCalculator;
    let mockRateLimitService;
    (0, globals_1.beforeAll)(() => {
        // Setup mocks
        mockCostCalculator = (0, CostCalculator_js_1.createTestCostCalculator)(testConfig);
        const { getCostCalculator } = require('../../services/CostCalculator.js');
        getCostCalculator.mockResolvedValue(mockCostCalculator);
        mockRateLimitService = {
            checkLimit: globals_1.jest.fn(),
        };
        const { getTenantRateLimitService } = require('../../services/TenantRateLimitService.js');
        getTenantRateLimitService.mockReturnValue(mockRateLimitService);
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Under-limit queries', () => {
        (0, globals_1.it)('should allow query under cost limit', async () => {
            // Setup rate limiter to allow request
            mockRateLimitService.checkLimit.mockResolvedValue({
                allowed: true,
                cost: 100,
                limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
                remaining: { perMinute: 4900, perHour: 49900 },
                reset: { perMinute: Date.now() + 60000, perHour: Date.now() + 3600000 },
            });
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: true,
                        logCosts: false,
                        logOverages: false,
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query { test }',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                (0, globals_1.expect)(result.body.singleResult.errors).toBeUndefined();
                (0, globals_1.expect)(result.body.singleResult.data).toEqual({ test: 'test' });
            }
            await server.stop();
        });
    });
    (0, globals_1.describe)('Over-limit queries', () => {
        (0, globals_1.it)('should reject query exceeding per-query limit', async () => {
            // Setup rate limiter to reject due to query cost
            mockRateLimitService.checkLimit.mockResolvedValue({
                allowed: false,
                cost: 2000,
                limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
                remaining: { perMinute: 5000, perHour: 50000 },
                reset: { perMinute: Date.now() + 60000, perHour: Date.now() + 3600000 },
                reason: 'QUERY_TOO_EXPENSIVE',
            });
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: true,
                        logCosts: false,
                        logOverages: false,
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query { expensive }',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                (0, globals_1.expect)(result.body.singleResult.errors).toBeDefined();
                (0, globals_1.expect)(result.body.singleResult.errors[0].message).toContain('too expensive');
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.code).toBe('GRAPHQL_COST_LIMIT_EXCEEDED');
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.cost).toBe(2000);
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.limit).toBe(500);
            }
            await server.stop();
        });
        (0, globals_1.it)('should reject query exceeding rate limit', async () => {
            // Setup rate limiter to reject due to rate limit
            mockRateLimitService.checkLimit.mockResolvedValue({
                allowed: false,
                cost: 100,
                limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
                remaining: { perMinute: 0, perHour: 45000 },
                reset: { perMinute: Date.now() + 30000, perHour: Date.now() + 3600000 },
                retryAfter: 30,
                reason: 'TENANT_RATE_LIMIT_EXCEEDED',
            });
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: true,
                        logCosts: false,
                        logOverages: false,
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query { test }',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                (0, globals_1.expect)(result.body.singleResult.errors).toBeDefined();
                (0, globals_1.expect)(result.body.singleResult.errors[0].message).toContain('Rate limit exceeded');
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.code).toBe('GRAPHQL_COST_LIMIT_EXCEEDED');
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.remaining).toBe(0);
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.retryAfter).toBe(30);
                (0, globals_1.expect)(result.body.singleResult.errors[0].extensions?.resetHint).toBeDefined();
            }
            await server.stop();
        });
        (0, globals_1.it)('should include error details in extensions', async () => {
            mockRateLimitService.checkLimit.mockResolvedValue({
                allowed: false,
                cost: 100,
                limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
                remaining: { perMinute: 0, perHour: 45000 },
                reset: { perMinute: Date.now() + 30000, perHour: Date.now() + 3600000 },
                retryAfter: 30,
                reason: 'TENANT_RATE_LIMIT_EXCEEDED',
            });
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: true,
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query { test }',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                const error = result.body.singleResult.errors[0];
                (0, globals_1.expect)(error.extensions).toMatchObject({
                    code: 'GRAPHQL_COST_LIMIT_EXCEEDED',
                    cost: 100,
                    limit: 500,
                    remaining: 0,
                    retryAfter: 30,
                    reason: 'TENANT_RATE_LIMIT_EXCEEDED',
                    tier: 'free',
                    limits: {
                        perQuery: 500,
                        perMinute: 5000,
                        perHour: 50000,
                    },
                });
                (0, globals_1.expect)(error.extensions.reset).toBeDefined();
                (0, globals_1.expect)(error.extensions.resetHint).toBeDefined();
            }
            await server.stop();
        });
    });
    (0, globals_1.describe)('Exempt operations', () => {
        (0, globals_1.it)('should skip cost check for exempt operations', async () => {
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: true,
                        exemptOperations: ['health'],
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query health { test }',
                operationName: 'health',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                (0, globals_1.expect)(result.body.singleResult.errors).toBeUndefined();
            }
            // Rate limiter should not have been called
            (0, globals_1.expect)(mockRateLimitService.checkLimit).not.toHaveBeenCalled();
            await server.stop();
        });
    });
    (0, globals_1.describe)('Warn mode', () => {
        (0, globals_1.it)('should log but allow over-limit queries when enforcement disabled', async () => {
            mockRateLimitService.checkLimit.mockResolvedValue({
                allowed: false,
                cost: 2000,
                limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
                remaining: { perMinute: 0, perHour: 45000 },
                reset: { perMinute: Date.now() + 30000, perHour: Date.now() + 3600000 },
                retryAfter: 30,
                reason: 'QUERY_TOO_EXPENSIVE',
            });
            const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
            server = new server_1.ApolloServer({
                schema,
                plugins: [
                    (0, graphqlCostPlugin_js_1.createGraphQLCostPlugin)({
                        enforceLimits: false, // Warn mode
                        logOverages: false,
                    }),
                ],
            });
            await server.start();
            const result = await server.executeOperation({
                query: 'query { expensive }',
            }, {
                contextValue: {
                    user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
                },
            });
            (0, globals_1.expect)(result.body.kind).toBe('single');
            if (result.body.kind === 'single') {
                // Should not have errors - query allowed in warn mode
                (0, globals_1.expect)(result.body.singleResult.errors).toBeUndefined();
                (0, globals_1.expect)(result.body.singleResult.data).toEqual({ expensive: 'expensive' });
            }
            await server.stop();
        });
    });
});
