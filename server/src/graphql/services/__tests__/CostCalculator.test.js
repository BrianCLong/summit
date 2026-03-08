"use strict";
// @ts-nocheck
/**
 * Unit tests for CostCalculator
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CostCalculator_js_1 = require("../CostCalculator.js");
const schema_1 = require("@graphql-tools/schema");
const graphql_1 = require("graphql");
// Test configuration
const testConfig = {
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
(0, globals_1.describe)('CostCalculator', () => {
    let calculator;
    let schema;
    (0, globals_1.beforeAll)(() => {
        calculator = (0, CostCalculator_js_1.createTestCostCalculator)(testConfig);
        schema = (0, schema_1.makeExecutableSchema)({ typeDefs });
    });
    (0, globals_1.describe)('Simple queries', () => {
        (0, globals_1.it)('should calculate cost for simple field query', () => {
            const query = (0, graphql_1.parse)(`
        query {
          user(id: "1") {
            id
            name
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Cost: user field (5) + id field (1) + name field (1) = 7
            (0, globals_1.expect)(cost).toBeGreaterThan(0);
            (0, globals_1.expect)(cost).toBeLessThan(20);
        });
        (0, globals_1.it)('should calculate cost for list query without limit', () => {
            const query = (0, graphql_1.parse)(`
        query {
          users {
            id
            name
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Cost should include base cost for users field
            (0, globals_1.expect)(cost).toBeGreaterThan(10);
        });
        (0, globals_1.it)('should calculate cost for list query with limit', () => {
            const query = (0, graphql_1.parse)(`
        query {
          users(limit: 10) {
            id
            name
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Cost should be multiplied by limit
            (0, globals_1.expect)(cost).toBeGreaterThan(10);
        });
        (0, globals_1.it)('should apply argument multipliers', () => {
            const query = (0, graphql_1.parse)(`
        query {
          search(query: "test", fullText: true) {
            id
            name
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Search has base cost of 50, fullText multiplier should increase it
            (0, globals_1.expect)(cost).toBeGreaterThan(50);
        });
    });
    (0, globals_1.describe)('Nested queries', () => {
        (0, globals_1.it)('should calculate cost for nested query', () => {
            const query = (0, graphql_1.parse)(`
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
            (0, globals_1.expect)(cost).toBeGreaterThan(15);
        });
        (0, globals_1.it)('should calculate cost for deeply nested query', () => {
            const query = (0, graphql_1.parse)(`
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
            (0, globals_1.expect)(cost).toBeGreaterThan(20);
        });
        (0, globals_1.it)('should handle depth argument multiplier', () => {
            const query = (0, graphql_1.parse)(`
        query {
          analytics(depth: 3) {
            data
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Analytics has base cost of 100, depth multiplier should increase it
            (0, globals_1.expect)(cost).toBeGreaterThan(100);
        });
    });
    (0, globals_1.describe)('Fragment handling', () => {
        (0, globals_1.it)('should calculate cost for query with fragments', () => {
            const query = (0, graphql_1.parse)(`
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
            (0, globals_1.expect)(cost).toBeGreaterThan(10);
        });
        (0, globals_1.it)('should calculate cost for nested fragments', () => {
            const query = (0, graphql_1.parse)(`
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
            (0, globals_1.expect)(cost).toBeGreaterThan(15);
        });
    });
    (0, globals_1.describe)('Configuration management', () => {
        (0, globals_1.it)('should get tenant limits for tier', () => {
            const limits = calculator.getTenantLimits('tenant-456', 'free');
            (0, globals_1.expect)(limits.maxCostPerQuery).toBe(500);
            (0, globals_1.expect)(limits.maxCostPerMinute).toBe(5000);
            (0, globals_1.expect)(limits.maxCostPerHour).toBe(50000);
        });
        (0, globals_1.it)('should get tenant override limits', () => {
            const limits = calculator.getTenantLimits('tenant-123', 'free');
            // Should use override, not tier
            (0, globals_1.expect)(limits.maxCostPerQuery).toBe(10000);
            (0, globals_1.expect)(limits.maxCostPerMinute).toBe(100000);
        });
        (0, globals_1.it)('should get user role multiplier', () => {
            (0, globals_1.expect)(calculator.getUserRoleMultiplier('admin')).toBe(5);
            (0, globals_1.expect)(calculator.getUserRoleMultiplier('viewer')).toBe(1);
            (0, globals_1.expect)(calculator.getUserRoleMultiplier('unknown')).toBe(1);
        });
        (0, globals_1.it)('should check if user is exempt from tenant limits', () => {
            (0, globals_1.expect)(calculator.isUserExemptFromTenantLimits('admin')).toBe(false);
            (0, globals_1.expect)(calculator.isUserExemptFromTenantLimits('viewer')).toBe(false);
        });
    });
    (0, globals_1.describe)('Edge cases', () => {
        (0, globals_1.it)('should handle query with no fields', () => {
            const query = (0, graphql_1.parse)(`
        query {
          __typename
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Should have minimal cost
            (0, globals_1.expect)(cost).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should handle query with high limit', () => {
            const query = (0, graphql_1.parse)(`
        query {
          users(limit: 1000) {
            id
          }
        }
      `);
            const cost = calculator.calculateCost(schema, query);
            // Cost should be capped at max limit (100)
            (0, globals_1.expect)(cost).toBeGreaterThan(100);
            (0, globals_1.expect)(cost).toBeLessThan(10000);
        });
    });
});
