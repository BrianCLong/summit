"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const graphql_middleware_js_1 = require("../graphql-middleware.js");
const schema_1 = require("@graphql-tools/schema");
const graphql_1 = require("graphql");
const graphql_tag_1 = require("graphql-tag");
const shield_js_1 = require("../shield.js");
// Define rules locally for the test to ensure isolation
const isAuthenticated = (0, shield_js_1.rule)({ cache: 'contextual' })(async (parent, args, ctx, info) => {
    return ctx.user !== null && ctx.user !== undefined;
});
const isAdmin = (0, shield_js_1.rule)({ cache: 'contextual' })(async (parent, args, ctx, info) => {
    return ctx.user?.roles?.includes('admin') || false;
});
// Define permissions locally matching the test schema
const testPermissions = (0, shield_js_1.shield)({
    Query: {
        health: shield_js_1.allow,
        listPersistedQueries: (0, shield_js_1.and)(isAuthenticated, isAdmin),
        protectedGeneric: isAuthenticated,
    },
}, {
    fallbackRule: shield_js_1.allow, // Allow mostly for test, strict control on specific fields
    allowExternalErrors: true,
    fallbackError: new Error('Not Authorised!'),
});
const typeDefs = (0, graphql_tag_1.gql) `
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
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
const schemaWithPermissions = (0, graphql_middleware_js_1.applyMiddleware)(schema, testPermissions);
(0, globals_1.describe)('GraphQL Permissions Integration', () => {
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
    const context = (user) => ({
        user,
        dataSources: {},
        loaders: {},
        request: {
            ip: '127.0.0.1',
            headers: {},
        },
        telemetry: {
            traceId: 'test',
            spanId: 'test',
        },
    });
    (0, globals_1.it)('Public queries (health) should be accessible without auth', async () => {
        const query = `query { health }`;
        const result = await (0, graphql_1.graphql)({
            schema: schemaWithPermissions,
            source: query,
            contextValue: context(null)
        });
        (0, globals_1.expect)(result.data?.health).toBe(true);
        (0, globals_1.expect)(result.errors).toBeUndefined();
    });
    (0, globals_1.it)('Admin queries should be forbidden for anonymous users', async () => {
        const query = `query { listPersistedQueries(tenantId: "t1") }`;
        const result = await (0, graphql_1.graphql)({
            schema: schemaWithPermissions,
            source: query,
            contextValue: context(null)
        });
        (0, globals_1.expect)(result.errors).toBeDefined();
        (0, globals_1.expect)(result.errors?.[0].message).toMatch(/Not Authorised/i);
    });
    (0, globals_1.it)('Admin queries should be forbidden for regular users', async () => {
        const query = `query { listPersistedQueries(tenantId: "t1") }`;
        const result = await (0, graphql_1.graphql)({
            schema: schemaWithPermissions,
            source: query,
            contextValue: context(regularUser)
        });
        (0, globals_1.expect)(result.errors).toBeDefined();
        (0, globals_1.expect)(result.errors?.[0].message).toMatch(/Not Authorised/i);
    });
    (0, globals_1.it)('Admin queries should be allowed for admin users', async () => {
        const query = `query { listPersistedQueries(tenantId: "t1") }`;
        const result = await (0, graphql_1.graphql)({
            schema: schemaWithPermissions,
            source: query,
            contextValue: context(adminUser)
        });
        (0, globals_1.expect)(result.data?.listPersistedQueries).toEqual(['query1']);
        (0, globals_1.expect)(result.errors).toBeUndefined();
    });
});
