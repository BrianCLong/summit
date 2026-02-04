import { describe, it, expect } from '@jest/globals';
import type { GraphQLContext } from '../apollo-v5-server.js';
import { applyMiddleware } from '../graphql-middleware.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql } from 'graphql';
import { gql } from 'graphql-tag';
import { shield, rule, and, allow } from '../shield.js';

// Define rules locally for the test to ensure isolation
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, ctx: GraphQLContext, info) => {
    return ctx.user !== null && ctx.user !== undefined;
  }
);

const isAdmin = rule({ cache: 'contextual' })(
  async (parent, args, ctx: GraphQLContext, info) => {
    return ctx.user?.roles?.includes('admin') || false;
  }
);

// Define permissions locally matching the test schema
const testPermissions = shield({
  Query: {
    health: allow,
    listPersistedQueries: and(isAuthenticated, isAdmin),
    protectedGeneric: isAuthenticated,
  },
}, {
  fallbackRule: allow, // Allow mostly for test, strict control on specific fields
  allowExternalErrors: true,
  fallbackError: new Error('Not Authorised!'),
});

const typeDefs = gql`
  type Query {
    health: Boolean
    listPersistedQueries(tenantId: String): [String]
    protectedGeneric: Boolean
  }
`;

const resolvers = {
  Query: {
    health: () => true,
    listPersistedQueries: () => ['query1'],
    protectedGeneric: () => true,
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const schemaWithPermissions = applyMiddleware(schema, testPermissions);

describe('GraphQL Permissions Integration', () => {
  const adminUser = {
    id: 'admin-1',
    roles: ['admin'],
    tenantId: 'tenant-1'
  };

  const regularUser = {
    id: 'user-1',
    roles: ['user'],
    tenantId: 'tenant-1'
  };

  const context = (user: typeof adminUser | null): Partial<GraphQLContext> => ({
    user,
    dataSources: {},
    loaders: {} as GraphQLContext['loaders'],
    request: {
      ip: '127.0.0.1',
      headers: {},
    },
    telemetry: {
      traceId: 'test',
      spanId: 'test',
    },
  });

  it('Public queries (health) should be accessible without auth', async () => {
    const query = `query { health }`;
    const result = await graphql({
        schema: schemaWithPermissions,
        source: query,
        contextValue: context(null)
    });
    expect(result.data?.health).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('Admin queries should be forbidden for anonymous users', async () => {
    const query = `query { listPersistedQueries(tenantId: "t1") }`;
    const result = await graphql({
        schema: schemaWithPermissions,
        source: query,
        contextValue: context(null)
    });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toMatch(/Not Authorised/i);
  });

  it('Admin queries should be forbidden for regular users', async () => {
    const query = `query { listPersistedQueries(tenantId: "t1") }`;
    const result = await graphql({
        schema: schemaWithPermissions,
        source: query,
        contextValue: context(regularUser)
    });
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toMatch(/Not Authorised/i);
  });

  it('Admin queries should be allowed for admin users', async () => {
    const query = `query { listPersistedQueries(tenantId: "t1") }`;
    const result = await graphql({
        schema: schemaWithPermissions,
        source: query,
        contextValue: context(adminUser)
    });
    expect(result.data?.listPersistedQueries).toEqual(['query1']);
    expect(result.errors).toBeUndefined();
  });
});
