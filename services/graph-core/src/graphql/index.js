"use strict";
// @ts-nocheck
/**
 * GraphQL Server Setup for Graph Core
 *
 * Configures Apollo Server with the canonical graph model schema and resolvers.
 *
 * @module graph-core/graphql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.resolvers = exports.typeDefs = void 0;
exports.createApolloServer = createApolloServer;
exports.setupGraphQL = setupGraphQL;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const schema_1 = require("@graphql-tools/schema");
const fs_1 = require("fs");
const url_1 = require("url");
const path_1 = require("path");
const resolvers_js_1 = require("./resolvers.js");
Object.defineProperty(exports, "resolvers", { enumerable: true, get: function () { return resolvers_js_1.resolvers; } });
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
// Read schema from file
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schema.graphql'), 'utf-8');
exports.typeDefs = typeDefs;
// Build executable schema
const schema = (0, schema_1.makeExecutableSchema)({
    typeDefs,
    resolvers: resolvers_js_1.resolvers,
});
exports.schema = schema;
/**
 * Create Apollo Server instance
 */
function createApolloServer() {
    return new server_1.ApolloServer({
        schema,
        introspection: process.env.NODE_ENV !== 'production',
        formatError: (formattedError, error) => {
            // Log error in development
            if (process.env.NODE_ENV !== 'production') {
                console.error('[GraphQL Error]', error);
            }
            // Don't expose internal errors in production
            if (process.env.NODE_ENV === 'production' &&
                formattedError.message.startsWith('Internal server error')) {
                return {
                    ...formattedError,
                    message: 'An unexpected error occurred',
                };
            }
            return formattedError;
        },
    });
}
/**
 * Setup GraphQL middleware on Express app
 */
async function setupGraphQL(app) {
    const server = createApolloServer();
    // Start server
    await server.start();
    // Apply middleware
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => {
            // Extract context from headers
            const userId = req.headers['x-user-id'];
            const tenantId = req.headers['x-tenant-id'];
            const clearance = req.headers['x-clearance'];
            const correlationId = req.headers['x-correlation-id'];
            return {
                userId,
                tenantId,
                clearance,
                correlationId,
            };
        },
    }));
    console.log('GraphQL endpoint available at /graphql');
}
