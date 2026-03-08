"use strict";
/**
 * GraphQL Resolver Test Utilities
 *
 * Provides utilities for testing GraphQL resolvers in isolation and integration.
 *
 * @module tests/integration/graphql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMutations = exports.TestQueries = exports.resolverAssertions = exports.ResolverTester = void 0;
exports.createResolverTester = createResolverTester;
const graphql_1 = require("graphql");
const enhanced_1 = require("../../factories/enhanced");
/**
 * GraphQL Resolver Tester
 *
 * Utility class for testing GraphQL resolvers with proper context setup.
 *
 * @example
 * ```typescript
 * const tester = new ResolverTester({ schema: mySchema });
 *
 * // Test a query
 * const result = await tester.query(`
 *   query GetEntity($id: ID!) {
 *     entity(id: $id) {
 *       id
 *       name
 *       type
 *     }
 *   }
 * `, { variables: { id: '123' } });
 *
 * expect(result.hasErrors).toBe(false);
 * expect(result.data?.entity).toBeDefined();
 *
 * // Test with different user roles
 * const adminResult = await tester.asAdmin().query('...');
 * const viewerResult = await tester.asViewer().query('...');
 * ```
 */
class ResolverTester {
    schema;
    baseContext;
    rootValue;
    constructor(options) {
        this.schema = options.schema;
        this.baseContext = enhanced_1.enhancedContextFactory.build(options.context || {});
        this.rootValue = options.rootValue || {};
    }
    /**
     * Execute a GraphQL query
     */
    async query(query, options = {}) {
        const startTime = Date.now();
        const context = this.buildContext(options.context);
        const result = await (0, graphql_1.graphql)({
            schema: this.schema,
            source: query,
            rootValue: this.rootValue,
            contextValue: context,
            variableValues: options.variables,
            operationName: options.operationName,
        });
        return this.formatResult(result, context, startTime);
    }
    /**
     * Execute a GraphQL mutation
     */
    async mutate(mutation, options = {}) {
        return this.query(mutation, options);
    }
    /**
     * Create a tester with admin context
     */
    asAdmin() {
        return new ResolverTester({
            schema: this.schema,
            context: (0, enhanced_1.createAdminContext)(),
            rootValue: this.rootValue,
        });
    }
    /**
     * Create a tester with analyst context
     */
    asAnalyst() {
        return new ResolverTester({
            schema: this.schema,
            context: (0, enhanced_1.createAnalystContext)(),
            rootValue: this.rootValue,
        });
    }
    /**
     * Create a tester with viewer context
     */
    asViewer() {
        return new ResolverTester({
            schema: this.schema,
            context: (0, enhanced_1.createViewerContext)(),
            rootValue: this.rootValue,
        });
    }
    /**
     * Create a tester with unauthenticated context
     */
    asUnauthenticated() {
        return new ResolverTester({
            schema: this.schema,
            context: (0, enhanced_1.createUnauthenticatedContext)(),
            rootValue: this.rootValue,
        });
    }
    /**
     * Create a tester with custom context
     */
    withContext(context) {
        return new ResolverTester({
            schema: this.schema,
            context: { ...this.baseContext, ...context },
            rootValue: this.rootValue,
        });
    }
    /**
     * Create a tester with mocked data sources
     */
    withMockedDataSources(mocks) {
        return new ResolverTester({
            schema: this.schema,
            context: {
                ...this.baseContext,
                dataSources: { ...this.baseContext.dataSources, ...mocks },
            },
            rootValue: this.rootValue,
        });
    }
    /**
     * Build context with overrides
     */
    buildContext(overrides) {
        if (!overrides) {
            return this.baseContext;
        }
        return { ...this.baseContext, ...overrides };
    }
    /**
     * Format execution result
     */
    formatResult(result, context, startTime) {
        return {
            data: result.data,
            errors: result.errors,
            hasErrors: !!(result.errors && result.errors.length > 0),
            firstError: result.errors?.[0] || null,
            context,
            executionTime: Date.now() - startTime,
        };
    }
}
exports.ResolverTester = ResolverTester;
/**
 * Resolver test assertions
 */
exports.resolverAssertions = {
    /**
     * Assert no errors in result
     */
    noErrors(result) {
        if (result.hasErrors) {
            const messages = result.errors?.map((e) => e.message).join(', ');
            throw new Error(`Expected no errors, got: ${messages}`);
        }
    },
    /**
     * Assert has specific error
     */
    hasError(result, messagePattern) {
        if (!result.hasErrors) {
            throw new Error('Expected errors, but got none');
        }
        const pattern = typeof messagePattern === 'string'
            ? new RegExp(messagePattern, 'i')
            : messagePattern;
        const hasMatchingError = result.errors?.some((e) => pattern.test(e.message));
        if (!hasMatchingError) {
            const messages = result.errors?.map((e) => e.message).join(', ');
            throw new Error(`Expected error matching ${pattern}, got: ${messages}`);
        }
    },
    /**
     * Assert has authentication error
     */
    hasAuthError(result) {
        this.hasError(result, /unauthorized|authentication|not authenticated/i);
    },
    /**
     * Assert has authorization error
     */
    hasAuthorizationError(result) {
        this.hasError(result, /forbidden|permission|not authorized|access denied/i);
    },
    /**
     * Assert has validation error
     */
    hasValidationError(result) {
        this.hasError(result, /validation|invalid|required|must be/i);
    },
    /**
     * Assert has not found error
     */
    hasNotFoundError(result) {
        this.hasError(result, /not found|does not exist|no such/i);
    },
    /**
     * Assert data exists
     */
    hasData(result) {
        if (!result.data) {
            throw new Error('Expected data, but got null/undefined');
        }
    },
    /**
     * Assert specific field in data
     */
    hasField(result, path) {
        const value = getNestedValue(result.data, path);
        if (value === undefined) {
            throw new Error(`Expected field at path "${path}" to exist`);
        }
    },
    /**
     * Assert field equals value
     */
    fieldEquals(result, path, expected) {
        const actual = getNestedValue(result.data, path);
        if (actual !== expected) {
            throw new Error(`Expected ${path} to equal ${expected}, got ${actual}`);
        }
    },
    /**
     * Assert execution time is within limit
     */
    withinTime(result, maxMs) {
        if (result.executionTime > maxMs) {
            throw new Error(`Expected execution time to be within ${maxMs}ms, got ${result.executionTime}ms`);
        }
    },
};
/**
 * Get nested value from object by path
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}
/**
 * Common GraphQL queries for testing
 */
exports.TestQueries = {
    // Health check
    health: `
    query HealthCheck {
      __typename
    }
  `,
    // Entity queries
    getEntity: `
    query GetEntity($id: ID!) {
      entity(id: $id) {
        id
        type
        props
        createdAt
        updatedAt
      }
    }
  `,
    listEntities: `
    query ListEntities($type: String, $q: String, $limit: Int, $offset: Int) {
      entities(type: $type, q: $q, limit: $limit, offset: $offset) {
        id
        type
        props
      }
    }
  `,
    searchEntities: `
    query SearchEntities($query: String!, $types: [String!], $limit: Int) {
      searchEntities(query: $query, types: $types, limit: $limit) {
        id
        name
        type
        score
      }
    }
  `,
    // Investigation queries
    getInvestigation: `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        title
        description
        status
        priority
        entityCount
        relationshipCount
        createdAt
        updatedAt
      }
    }
  `,
    listInvestigations: `
    query ListInvestigations($status: InvestigationStatus, $first: Int) {
      investigations(status: $status, first: $first) {
        edges {
          node {
            id
            title
            status
          }
        }
        totalCount
      }
    }
  `,
    // Relationship queries
    getRelationship: `
    query GetRelationship($id: ID!) {
      relationship(id: $id) {
        id
        type
        sourceId
        targetId
        properties
        confidence
      }
    }
  `,
    // Graph queries
    getGraphData: `
    query GetGraphData($investigationId: ID!) {
      graphData(investigationId: $investigationId) {
        nodes {
          id
          type
          label
        }
        edges {
          id
          type
          sourceId
          targetId
        }
        nodeCount
        edgeCount
      }
    }
  `,
    // User queries
    currentUser: `
    query CurrentUser {
      me {
        id
        email
        username
        role
        permissions
      }
    }
  `,
};
/**
 * Common GraphQL mutations for testing
 */
exports.TestMutations = {
    // Entity mutations
    createEntity: `
    mutation CreateEntity($input: EntityInput!) {
      createEntity(input: $input) {
        id
        type
        props
      }
    }
  `,
    updateEntity: `
    mutation UpdateEntity($id: ID!, $input: EntityInput!) {
      updateEntity(id: $id, input: $input) {
        id
        type
        props
        updatedAt
      }
    }
  `,
    deleteEntity: `
    mutation DeleteEntity($id: ID!) {
      deleteEntity(id: $id)
    }
  `,
    // Investigation mutations
    createInvestigation: `
    mutation CreateInvestigation($input: CreateInvestigationInput!) {
      createInvestigation(input: $input) {
        id
        title
        description
        status
      }
    }
  `,
    updateInvestigation: `
    mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
      updateInvestigation(id: $id, input: $input) {
        id
        title
        status
        updatedAt
      }
    }
  `,
    // Relationship mutations
    createRelationship: `
    mutation CreateRelationship($input: CreateRelationshipInput!) {
      createRelationship(input: $input) {
        id
        type
        sourceId
        targetId
      }
    }
  `,
    deleteRelationship: `
    mutation DeleteRelationship($id: ID!) {
      deleteRelationship(id: $id) {
        success
        message
      }
    }
  `,
};
/**
 * Create a resolver tester instance
 */
function createResolverTester(options) {
    return new ResolverTester(options);
}
exports.default = {
    ResolverTester,
    createResolverTester,
    resolverAssertions: exports.resolverAssertions,
    TestQueries: exports.TestQueries,
    TestMutations: exports.TestMutations,
};
