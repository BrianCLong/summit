// @ts-nocheck
/**
 * Integration tests for GraphQL Cost Plugin
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createGraphQLCostPlugin } from '../graphqlCostPlugin.js';
import { createTestCostCalculator, type CostConfig } from '../../services/CostCalculator.js';

// Mock cost calculator
jest.mock('../../services/CostCalculator.js', () => {
  const actualModule = jest.requireActual('../../services/CostCalculator.js');
  return {
    ...actualModule,
    getCostCalculator: jest.fn(),
  };
});

// Mock rate limiter service
jest.mock('../../services/TenantRateLimitService.js', () => ({
  getTenantRateLimitService: jest.fn(),
}));

// Mock metrics
jest.mock('../../../monitoring/metrics.js', () => ({
  graphqlQueryCostHistogram: {
    labels: jest.fn(() => ({ observe: jest.fn() })),
  },
  graphqlCostLimitExceededTotal: {
    labels: jest.fn(() => ({ inc: jest.fn() })),
  },
  graphqlCostLimitRemaining: {
    labels: jest.fn(() => ({ set: jest.fn() })),
  },
  graphqlTenantCostUsage: {
    labels: jest.fn(() => ({ inc: jest.fn() })),
  },
  graphqlCostRateLimitHits: {
    labels: jest.fn(() => ({ inc: jest.fn() })),
  },
  graphqlPerTenantOverageCount: {
    labels: jest.fn(() => ({ inc: jest.fn() })),
  },
}));

const testConfig: CostConfig = {
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

describe('GraphQL Cost Plugin Integration', () => {
  let server: ApolloServer;
  let mockCostCalculator: any;
  let mockRateLimitService: any;

  beforeAll(() => {
    // Setup mocks
    mockCostCalculator = createTestCostCalculator(testConfig);
    const { getCostCalculator } = require('../../services/CostCalculator.js');
    getCostCalculator.mockResolvedValue(mockCostCalculator);

    mockRateLimitService = {
      checkLimit: jest.fn(),
    };
    const { getTenantRateLimitService } = require('../../services/TenantRateLimitService.js');
    getTenantRateLimitService.mockReturnValue(mockRateLimitService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Under-limit queries', () => {
    it('should allow query under cost limit', async () => {
      // Setup rate limiter to allow request
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        cost: 100,
        limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
        remaining: { perMinute: 4900, perHour: 49900 },
        reset: { perMinute: Date.now() + 60000, perHour: Date.now() + 3600000 },
      });

      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: true,
            logCosts: false,
            logOverages: false,
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query { test }',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data).toEqual({ test: 'test' });
      }

      await server.stop();
    });
  });

  describe('Over-limit queries', () => {
    it('should reject query exceeding per-query limit', async () => {
      // Setup rate limiter to reject due to query cost
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        cost: 2000,
        limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
        remaining: { perMinute: 5000, perHour: 50000 },
        reset: { perMinute: Date.now() + 60000, perHour: Date.now() + 3600000 },
        reason: 'QUERY_TOO_EXPENSIVE',
      });

      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: true,
            logCosts: false,
            logOverages: false,
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query { expensive }',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors![0].message).toContain('too expensive');
        expect(result.body.singleResult.errors![0].extensions?.code).toBe(
          'GRAPHQL_COST_LIMIT_EXCEEDED'
        );
        expect(result.body.singleResult.errors![0].extensions?.cost).toBe(2000);
        expect(result.body.singleResult.errors![0].extensions?.limit).toBe(500);
      }

      await server.stop();
    });

    it('should reject query exceeding rate limit', async () => {
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

      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: true,
            logCosts: false,
            logOverages: false,
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query { test }',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors![0].message).toContain('Rate limit exceeded');
        expect(result.body.singleResult.errors![0].extensions?.code).toBe(
          'GRAPHQL_COST_LIMIT_EXCEEDED'
        );
        expect(result.body.singleResult.errors![0].extensions?.remaining).toBe(0);
        expect(result.body.singleResult.errors![0].extensions?.retryAfter).toBe(30);
        expect(result.body.singleResult.errors![0].extensions?.resetHint).toBeDefined();
      }

      await server.stop();
    });

    it('should include error details in extensions', async () => {
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        cost: 100,
        limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
        remaining: { perMinute: 0, perHour: 45000 },
        reset: { perMinute: Date.now() + 30000, perHour: Date.now() + 3600000 },
        retryAfter: 30,
        reason: 'TENANT_RATE_LIMIT_EXCEEDED',
      });

      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: true,
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query { test }',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const error = result.body.singleResult.errors![0];
        expect(error.extensions).toMatchObject({
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
        expect(error.extensions.reset).toBeDefined();
        expect(error.extensions.resetHint).toBeDefined();
      }

      await server.stop();
    });
  });

  describe('Exempt operations', () => {
    it('should skip cost check for exempt operations', async () => {
      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: true,
            exemptOperations: ['health'],
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query health { test }',
          operationName: 'health',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
      }

      // Rate limiter should not have been called
      expect(mockRateLimitService.checkLimit).not.toHaveBeenCalled();

      await server.stop();
    });
  });

  describe('Warn mode', () => {
    it('should log but allow over-limit queries when enforcement disabled', async () => {
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        cost: 2000,
        limits: { perQuery: 500, perMinute: 5000, perHour: 50000 },
        remaining: { perMinute: 0, perHour: 45000 },
        reset: { perMinute: Date.now() + 30000, perHour: Date.now() + 3600000 },
        retryAfter: 30,
        reason: 'QUERY_TOO_EXPENSIVE',
      });

      const schema = makeExecutableSchema({ typeDefs, resolvers });
      server = new ApolloServer({
        schema,
        plugins: [
          createGraphQLCostPlugin({
            enforceLimits: false, // Warn mode
            logOverages: false,
          }),
        ],
      });

      await server.start();

      const result = await server.executeOperation(
        {
          query: 'query { expensive }',
        },
        {
          contextValue: {
            user: { id: 'user1', tenantId: 'tenant1', tier: 'free' },
          },
        }
      );

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        // Should not have errors - query allowed in warn mode
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data).toEqual({ expensive: 'expensive' });
      }

      await server.stop();
    });
  });
});
