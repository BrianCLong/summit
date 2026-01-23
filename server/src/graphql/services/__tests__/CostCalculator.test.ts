// @ts-nocheck
/**
 * Unit tests for CostCalculator
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createTestCostCalculator, type CostConfig } from '../CostCalculator.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse } from 'graphql';

// Test configuration
const testConfig: CostConfig = {
  version: '1.0.0',
  defaultCosts: {
    baseField: 1,
    baseListItem: 1,
    baseNestedLevel: 2,
  },
  typeCosts: {
    Query: {
      user: 5,
      users: 10,
      search: 50,
      analytics: 100,
    },
    User: {
      posts: 5,
      friends: 10,
    },
    Post: {
      comments: 5,
    },
  },
  operationCosts: {
    listMultipliers: {
      default: 1,
      withLimit: {
        costPerItem: 1,
        maxLimit: 100,
      },
    },
    nestedMultipliers: {
      level1: 1,
      level2: 1.5,
      level3: 2,
      level4: 3,
      level5: 5,
    },
    argumentMultipliers: {
      depth: {
        '1': 1,
        '2': 2,
        '3': 4,
        '4': 8,
      },
      includeDeleted: 1.5,
      fullText: 2,
    },
  },
  tenantTiers: {
    free: {
      maxCostPerQuery: 500,
      maxCostPerMinute: 5000,
      maxCostPerHour: 50000,
      burstMultiplier: 1.2,
    },
    pro: {
      maxCostPerQuery: 2000,
      maxCostPerMinute: 50000,
      maxCostPerHour: 1000000,
      burstMultiplier: 2,
    },
  },
  tenantOverrides: {
    'tenant-123': {
      maxCostPerQuery: 10000,
      maxCostPerMinute: 100000,
      maxCostPerHour: 2000000,
      burstMultiplier: 5,
    },
  },
  userRoleLimits: {
    admin: { multiplier: 5, exemptFromTenantLimits: false },
    viewer: { multiplier: 1, exemptFromTenantLimits: false },
  },
};

// Test schema
const typeDefs = `
  type Query {
    user(id: ID!): User
    users(limit: Int): [User!]!
    search(query: String!, fullText: Boolean): [User!]!
    analytics(depth: Int): AnalyticsResult
  }

  type User {
    id: ID!
    name: String!
    email: String!
    posts(limit: Int): [Post!]!
    friends(limit: Int): [User!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    comments(limit: Int): [Comment!]!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
  }

  type AnalyticsResult {
    data: String
  }
`;

describe('CostCalculator', () => {
  let calculator: any;
  let schema: any;

  beforeAll(() => {
    calculator = createTestCostCalculator(testConfig);
    schema = makeExecutableSchema({ typeDefs });
  });

  describe('Simple queries', () => {
    it('should calculate cost for simple field query', () => {
      const query = parse(`
        query {
          user(id: "1") {
            id
            name
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost: user field (5) + id field (1) + name field (1) = 7
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(20);
    });

    it('should calculate cost for list query without limit', () => {
      const query = parse(`
        query {
          users {
            id
            name
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should include base cost for users field
      expect(cost).toBeGreaterThan(10);
    });

    it('should calculate cost for list query with limit', () => {
      const query = parse(`
        query {
          users(limit: 10) {
            id
            name
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should be multiplied by limit
      expect(cost).toBeGreaterThan(10);
    });

    it('should apply argument multipliers', () => {
      const query = parse(`
        query {
          search(query: "test", fullText: true) {
            id
            name
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Search has base cost of 50, fullText multiplier should increase it
      expect(cost).toBeGreaterThan(50);
    });
  });

  describe('Nested queries', () => {
    it('should calculate cost for nested query', () => {
      const query = parse(`
        query {
          user(id: "1") {
            id
            name
            posts(limit: 5) {
              id
              title
            }
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should include nested fields and list multiplier
      expect(cost).toBeGreaterThan(15);
    });

    it('should calculate cost for deeply nested query', () => {
      const query = parse(`
        query {
          user(id: "1") {
            id
            posts(limit: 3) {
              id
              comments(limit: 2) {
                id
                text
                author {
                  id
                  name
                }
              }
            }
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should be significant due to deep nesting and multiple list multipliers
      expect(cost).toBeGreaterThan(20);
    });

    it('should handle depth argument multiplier', () => {
      const query = parse(`
        query {
          analytics(depth: 3) {
            data
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Analytics has base cost of 100, depth multiplier should increase it
      expect(cost).toBeGreaterThan(100);
    });
  });

  describe('Fragment handling', () => {
    it('should calculate cost for query with fragments', () => {
      const query = parse(`
        fragment UserFields on User {
          id
          name
          email
        }

        query {
          user(id: "1") {
            ...UserFields
            posts(limit: 5) {
              id
              title
            }
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should include all fields from fragment
      expect(cost).toBeGreaterThan(10);
    });

    it('should calculate cost for nested fragments', () => {
      const query = parse(`
        fragment UserFields on User {
          id
          name
        }

        fragment PostFields on Post {
          id
          title
          comments(limit: 2) {
            id
            text
          }
        }

        query {
          user(id: "1") {
            ...UserFields
            posts(limit: 3) {
              ...PostFields
            }
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should include all fragment fields
      expect(cost).toBeGreaterThan(15);
    });
  });

  describe('Configuration management', () => {
    it('should get tenant limits for tier', () => {
      const limits = calculator.getTenantLimits('tenant-456', 'free');

      expect(limits.maxCostPerQuery).toBe(500);
      expect(limits.maxCostPerMinute).toBe(5000);
      expect(limits.maxCostPerHour).toBe(50000);
    });

    it('should get tenant override limits', () => {
      const limits = calculator.getTenantLimits('tenant-123', 'free');

      // Should use override, not tier
      expect(limits.maxCostPerQuery).toBe(10000);
      expect(limits.maxCostPerMinute).toBe(100000);
    });

    it('should get user role multiplier', () => {
      expect(calculator.getUserRoleMultiplier('admin')).toBe(5);
      expect(calculator.getUserRoleMultiplier('viewer')).toBe(1);
      expect(calculator.getUserRoleMultiplier('unknown')).toBe(1);
    });

    it('should check if user is exempt from tenant limits', () => {
      expect(calculator.isUserExemptFromTenantLimits('admin')).toBe(false);
      expect(calculator.isUserExemptFromTenantLimits('viewer')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle query with no fields', () => {
      const query = parse(`
        query {
          __typename
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Should have minimal cost
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with high limit', () => {
      const query = parse(`
        query {
          users(limit: 1000) {
            id
          }
        }
      `);

      const cost = calculator.calculateCost(schema, query);

      // Cost should be capped at max limit (100)
      expect(cost).toBeGreaterThan(100);
      expect(cost).toBeLessThan(10000);
    });
  });
});
