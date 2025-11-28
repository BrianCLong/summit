/**
 * Enhanced Context Factory
 *
 * Type-safe factory for generating test GraphQL context objects.
 * Supports authentication, authorization, data sources, and request context.
 *
 * @module tests/factories/enhanced
 */

import { defineFactory, random } from '../base';
import { enhancedUserFactory, type TestUserEnhanced, type UserRole } from './EnhancedUserFactory';

/**
 * Tenant interface
 */
export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  features: string[];
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
}

/**
 * Request info interface
 */
export interface TestRequestInfo {
  id: string;
  ip: string;
  userAgent: string;
  origin: string;
  method: string;
  path: string;
  timestamp: Date;
}

/**
 * Data source mocks interface
 */
export interface TestDataSources {
  neo4j: MockNeo4jDataSource;
  postgres: MockPostgresDataSource;
  redis: MockRedisDataSource;
  elasticsearch: MockElasticsearchDataSource;
}

/**
 * Mock Neo4j data source
 */
export interface MockNeo4jDataSource {
  query: jest.Mock;
  run: jest.Mock;
  beginTransaction: jest.Mock;
  close: jest.Mock;
}

/**
 * Mock Postgres data source
 */
export interface MockPostgresDataSource {
  query: jest.Mock;
  connect: jest.Mock;
  release: jest.Mock;
  transaction: jest.Mock;
}

/**
 * Mock Redis data source
 */
export interface MockRedisDataSource {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
}

/**
 * Mock Elasticsearch data source
 */
export interface MockElasticsearchDataSource {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
  bulk: jest.Mock;
}

/**
 * DataLoader mocks interface
 */
export interface TestLoaders {
  entityLoader: {
    load: jest.Mock;
    loadMany: jest.Mock;
    clear: jest.Mock;
    clearAll: jest.Mock;
  };
  userLoader: {
    load: jest.Mock;
    loadMany: jest.Mock;
    clear: jest.Mock;
    clearAll: jest.Mock;
  };
  investigationLoader: {
    load: jest.Mock;
    loadMany: jest.Mock;
    clear: jest.Mock;
    clearAll: jest.Mock;
  };
  relationshipLoader: {
    load: jest.Mock;
    loadMany: jest.Mock;
    clear: jest.Mock;
    clearAll: jest.Mock;
  };
}

/**
 * GraphQL Context interface for tests
 */
export interface TestContextEnhanced {
  requestId: string;
  user: TestUserEnhanced | null;
  tenant: TestTenant | null;
  permissions: string[];
  roles: UserRole[];
  isAuthenticated: boolean;
  request: TestRequestInfo;
  headers: Record<string, string>;
  dataSources: TestDataSources;
  loaders: TestLoaders;
  services: Record<string, any>;
  cache: Map<string, any>;
  startTime: number;
}

/**
 * Create mock data sources
 */
function createMockDataSources(): TestDataSources {
  return {
    neo4j: {
      query: jest.fn().mockResolvedValue({ records: [] }),
      run: jest.fn().mockResolvedValue({ records: [] }),
      beginTransaction: jest.fn().mockResolvedValue({
        run: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      }),
      close: jest.fn(),
    },
    postgres: {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
      release: jest.fn(),
      transaction: jest.fn(),
    },
    redis: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(-1),
    },
    elasticsearch: {
      search: jest.fn().mockResolvedValue({ hits: { hits: [], total: { value: 0 } } }),
      index: jest.fn().mockResolvedValue({ result: 'created' }),
      delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
      bulk: jest.fn().mockResolvedValue({ errors: false }),
    },
  };
}

/**
 * Create mock data loaders
 */
function createMockLoaders(): TestLoaders {
  const createLoader = () => ({
    load: jest.fn().mockResolvedValue(null),
    loadMany: jest.fn().mockResolvedValue([]),
    clear: jest.fn(),
    clearAll: jest.fn(),
  });

  return {
    entityLoader: createLoader(),
    userLoader: createLoader(),
    investigationLoader: createLoader(),
    relationshipLoader: createLoader(),
  };
}

/**
 * Enhanced Context Factory for GraphQL resolver testing
 */
export const enhancedContextFactory = defineFactory<TestContextEnhanced>({
  defaults: () => {
    const user = enhancedUserFactory.build();
    const now = Date.now();

    return {
      requestId: random.uuid(),
      user,
      tenant: {
        id: user.tenantId,
        name: 'Test Tenant',
        slug: 'test-tenant',
        settings: {},
        features: ['investigations', 'entities', 'relationships', 'copilot'],
        plan: 'professional',
      },
      permissions: user.permissions,
      roles: [user.role],
      isAuthenticated: true,
      request: {
        id: random.uuid(),
        ip: '127.0.0.1',
        userAgent: 'Jest Test Runner',
        origin: 'http://localhost:3000',
        method: 'POST',
        path: '/graphql',
        timestamp: new Date(),
      },
      headers: {
        'content-type': 'application/json',
        'x-request-id': random.uuid(),
      },
      dataSources: createMockDataSources(),
      loaders: createMockLoaders(),
      services: {},
      cache: new Map(),
      startTime: now,
    };
  },
  traits: {
    // Authentication traits
    authenticated: (base) => ({
      user: base.user || enhancedUserFactory.build(),
      isAuthenticated: true,
    }),
    unauthenticated: {
      user: null,
      tenant: null,
      permissions: [],
      roles: [],
      isAuthenticated: false,
    },

    // Role-based traits
    admin: () => {
      const user = enhancedUserFactory.buildWithTrait('admin');
      return {
        user,
        permissions: user.permissions,
        roles: ['admin' as UserRole],
      };
    },
    analyst: () => {
      const user = enhancedUserFactory.buildWithTrait('analyst');
      return {
        user,
        permissions: user.permissions,
        roles: ['analyst' as UserRole],
      };
    },
    viewer: () => {
      const user = enhancedUserFactory.buildWithTrait('viewer');
      return {
        user,
        permissions: user.permissions,
        roles: ['viewer' as UserRole],
      };
    },

    // Tenant traits
    enterprise: (base) => ({
      tenant: {
        ...base.tenant!,
        plan: 'enterprise' as const,
        features: [
          'investigations',
          'entities',
          'relationships',
          'copilot',
          'ai-analysis',
          'advanced-analytics',
          'custom-reports',
          'api-access',
          'sso',
          'audit-logs',
        ],
      },
    }),
    starter: (base) => ({
      tenant: {
        ...base.tenant!,
        plan: 'starter' as const,
        features: ['investigations', 'entities', 'relationships'],
      },
    }),
    free: (base) => ({
      tenant: {
        ...base.tenant!,
        plan: 'free' as const,
        features: ['investigations', 'entities'],
      },
    }),

    // Multi-tenant traits
    multiTenant: () => ({
      tenant: {
        id: random.uuid(),
        name: `Tenant ${random.string(6)}`,
        slug: `tenant-${random.string(6)}`,
        settings: {},
        features: ['investigations', 'entities', 'relationships'],
        plan: 'professional' as const,
      },
    }),

    // Request context traits
    fromBrowser: (base) => ({
      request: {
        ...base.request,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        origin: 'https://app.intelgraph.io',
      },
    }),
    fromApi: (base) => ({
      request: {
        ...base.request,
        userAgent: 'IntelGraph-API-Client/1.0',
        origin: '',
      },
      headers: {
        ...base.headers,
        'x-api-key': `api-key-${random.string(32)}`,
      },
    }),
    fromCli: (base) => ({
      request: {
        ...base.request,
        userAgent: 'IntelGraph-CLI/1.0',
        origin: '',
      },
    }),

    // With specific services
    withAuthService: (base) => ({
      services: {
        ...base.services,
        auth: {
          verifyToken: jest.fn().mockResolvedValue(base.user),
          hasPermission: jest.fn().mockReturnValue(true),
          login: jest.fn(),
          logout: jest.fn(),
        },
      },
    }),
    withGraphService: (base) => ({
      services: {
        ...base.services,
        graph: {
          createEntity: jest.fn(),
          updateEntity: jest.fn(),
          deleteEntity: jest.fn(),
          createRelationship: jest.fn(),
          findPath: jest.fn(),
          traverseGraph: jest.fn(),
        },
      },
    }),
    withCopilotService: (base) => ({
      services: {
        ...base.services,
        copilot: {
          analyze: jest.fn(),
          suggest: jest.fn(),
          explain: jest.fn(),
          summarize: jest.fn(),
        },
      },
    }),
  },
});

/**
 * Create an authenticated context for a specific user
 */
export function createContextForUser(user: TestUserEnhanced): TestContextEnhanced {
  return enhancedContextFactory.build({
    user,
    permissions: user.permissions,
    roles: [user.role],
    isAuthenticated: true,
    tenant: {
      id: user.tenantId,
      name: 'Test Tenant',
      slug: 'test-tenant',
      settings: {},
      features: ['investigations', 'entities', 'relationships', 'copilot'],
      plan: 'professional',
    },
  });
}

/**
 * Create an unauthenticated context
 */
export function createUnauthenticatedContext(): TestContextEnhanced {
  return enhancedContextFactory.buildWithTrait('unauthenticated');
}

/**
 * Create an admin context
 */
export function createAdminContext(): TestContextEnhanced {
  return enhancedContextFactory.buildWithTrait('admin');
}

/**
 * Create an analyst context
 */
export function createAnalystContext(): TestContextEnhanced {
  return enhancedContextFactory.buildWithTrait('analyst');
}

/**
 * Create a viewer context
 */
export function createViewerContext(): TestContextEnhanced {
  return enhancedContextFactory.buildWithTrait('viewer');
}

export default enhancedContextFactory;
