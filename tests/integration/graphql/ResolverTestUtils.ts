/**
 * GraphQL Resolver Test Utilities
 *
 * Provides utilities for testing GraphQL resolvers in isolation and integration.
 *
 * @module tests/integration/graphql
 */

import { graphql, GraphQLSchema, ExecutionResult } from 'graphql';
import {
  enhancedContextFactory,
  createAdminContext,
  createAnalystContext,
  createViewerContext,
  createUnauthenticatedContext,
  type TestContextEnhanced,
} from '../../factories/enhanced';

/**
 * Resolver test options
 */
export interface ResolverTestOptions {
  schema: GraphQLSchema;
  context?: Partial<TestContextEnhanced>;
  rootValue?: any;
}

/**
 * Query execution options
 */
export interface QueryOptions {
  variables?: Record<string, any>;
  operationName?: string;
  context?: Partial<TestContextEnhanced>;
}

/**
 * Resolver test result
 */
export interface ResolverTestResult<T = any> {
  data: T | null;
  errors: readonly any[] | undefined;
  hasErrors: boolean;
  firstError: any | null;
  context: TestContextEnhanced;
  executionTime: number;
}

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
export class ResolverTester {
  private schema: GraphQLSchema;
  private baseContext: TestContextEnhanced;
  private rootValue: any;

  constructor(options: ResolverTestOptions) {
    this.schema = options.schema;
    this.baseContext = enhancedContextFactory.build(options.context || {});
    this.rootValue = options.rootValue || {};
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = any>(
    query: string,
    options: QueryOptions = {}
  ): Promise<ResolverTestResult<T>> {
    const startTime = Date.now();
    const context = this.buildContext(options.context);

    const result = await graphql({
      schema: this.schema,
      source: query,
      rootValue: this.rootValue,
      contextValue: context,
      variableValues: options.variables,
      operationName: options.operationName,
    });

    return this.formatResult<T>(result, context, startTime);
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T = any>(
    mutation: string,
    options: QueryOptions = {}
  ): Promise<ResolverTestResult<T>> {
    return this.query<T>(mutation, options);
  }

  /**
   * Create a tester with admin context
   */
  asAdmin(): ResolverTester {
    return new ResolverTester({
      schema: this.schema,
      context: createAdminContext(),
      rootValue: this.rootValue,
    });
  }

  /**
   * Create a tester with analyst context
   */
  asAnalyst(): ResolverTester {
    return new ResolverTester({
      schema: this.schema,
      context: createAnalystContext(),
      rootValue: this.rootValue,
    });
  }

  /**
   * Create a tester with viewer context
   */
  asViewer(): ResolverTester {
    return new ResolverTester({
      schema: this.schema,
      context: createViewerContext(),
      rootValue: this.rootValue,
    });
  }

  /**
   * Create a tester with unauthenticated context
   */
  asUnauthenticated(): ResolverTester {
    return new ResolverTester({
      schema: this.schema,
      context: createUnauthenticatedContext(),
      rootValue: this.rootValue,
    });
  }

  /**
   * Create a tester with custom context
   */
  withContext(context: Partial<TestContextEnhanced>): ResolverTester {
    return new ResolverTester({
      schema: this.schema,
      context: { ...this.baseContext, ...context },
      rootValue: this.rootValue,
    });
  }

  /**
   * Create a tester with mocked data sources
   */
  withMockedDataSources(
    mocks: Partial<TestContextEnhanced['dataSources']>
  ): ResolverTester {
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
  private buildContext(overrides?: Partial<TestContextEnhanced>): TestContextEnhanced {
    if (!overrides) {
      return this.baseContext;
    }
    return { ...this.baseContext, ...overrides };
  }

  /**
   * Format execution result
   */
  private formatResult<T>(
    result: ExecutionResult,
    context: TestContextEnhanced,
    startTime: number
  ): ResolverTestResult<T> {
    return {
      data: result.data as T | null,
      errors: result.errors,
      hasErrors: !!(result.errors && result.errors.length > 0),
      firstError: result.errors?.[0] || null,
      context,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Resolver test assertions
 */
export const resolverAssertions = {
  /**
   * Assert no errors in result
   */
  noErrors(result: ResolverTestResult): void {
    if (result.hasErrors) {
      const messages = result.errors?.map((e) => e.message).join(', ');
      throw new Error(`Expected no errors, got: ${messages}`);
    }
  },

  /**
   * Assert has specific error
   */
  hasError(result: ResolverTestResult, messagePattern: string | RegExp): void {
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
  hasAuthError(result: ResolverTestResult): void {
    this.hasError(result, /unauthorized|authentication|not authenticated/i);
  },

  /**
   * Assert has authorization error
   */
  hasAuthorizationError(result: ResolverTestResult): void {
    this.hasError(result, /forbidden|permission|not authorized|access denied/i);
  },

  /**
   * Assert has validation error
   */
  hasValidationError(result: ResolverTestResult): void {
    this.hasError(result, /validation|invalid|required|must be/i);
  },

  /**
   * Assert has not found error
   */
  hasNotFoundError(result: ResolverTestResult): void {
    this.hasError(result, /not found|does not exist|no such/i);
  },

  /**
   * Assert data exists
   */
  hasData(result: ResolverTestResult): void {
    if (!result.data) {
      throw new Error('Expected data, but got null/undefined');
    }
  },

  /**
   * Assert specific field in data
   */
  hasField(result: ResolverTestResult, path: string): void {
    const value = getNestedValue(result.data, path);
    if (value === undefined) {
      throw new Error(`Expected field at path "${path}" to exist`);
    }
  },

  /**
   * Assert field equals value
   */
  fieldEquals(result: ResolverTestResult, path: string, expected: any): void {
    const actual = getNestedValue(result.data, path);
    if (actual !== expected) {
      throw new Error(`Expected ${path} to equal ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert execution time is within limit
   */
  withinTime(result: ResolverTestResult, maxMs: number): void {
    if (result.executionTime > maxMs) {
      throw new Error(
        `Expected execution time to be within ${maxMs}ms, got ${result.executionTime}ms`
      );
    }
  },
};

/**
 * Get nested value from object by path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Common GraphQL queries for testing
 */
export const TestQueries = {
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
        name
        type
        description
        properties
        confidence
        createdAt
        updatedAt
      }
    }
  `,

  listEntities: `
    query ListEntities($investigationId: ID!, $first: Int, $after: String) {
      entities(investigationId: $investigationId, first: $first, after: $after) {
        edges {
          node {
            id
            name
            type
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
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
export const TestMutations = {
  // Entity mutations
  createEntity: `
    mutation CreateEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
        name
        type
        description
      }
    }
  `,

  updateEntity: `
    mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
      updateEntity(id: $id, input: $input) {
        id
        name
        type
        updatedAt
      }
    }
  `,

  deleteEntity: `
    mutation DeleteEntity($id: ID!) {
      deleteEntity(id: $id) {
        success
        message
      }
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
export function createResolverTester(options: ResolverTestOptions): ResolverTester {
  return new ResolverTester(options);
}

export default {
  ResolverTester,
  createResolverTester,
  resolverAssertions,
  TestQueries,
  TestMutations,
};
