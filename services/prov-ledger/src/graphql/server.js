"use strict";
/**
 * GraphQL Server for Provenance & Claims Ledger
 * Integrates with Fastify REST service
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGraphQL = setupGraphQL;
const server_1 = require("@apollo/server");
const fastify_1 = __importStar(require("@as-integrations/fastify"));
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const resolvers_js_1 = require("./resolvers.js");
const __dirname = (0, path_1.dirname)((0, url_1.fileURLToPath)(import.meta.url));
async function setupGraphQL(app, pool) {
    // Set database pool for resolvers
    (0, resolvers_js_1.setDatabasePool)(pool);
    // Load schema
    const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../schema.graphql'), 'utf-8');
    // Create Apollo Server
    const apollo = new server_1.ApolloServer({
        typeDefs,
        resolvers: resolvers_js_1.resolvers,
        plugins: [
            (0, fastify_1.fastifyApolloDrainPlugin)(app),
            {
                async requestDidStart() {
                    return {
                        async didEncounterErrors(requestContext) {
                            app.log.error({
                                errors: requestContext.errors,
                                operation: requestContext.request.operationName,
                            }, 'GraphQL errors');
                        },
                    };
                },
            },
        ],
        formatError: (formattedError, error) => {
            // Log errors but sanitize sensitive data
            app.log.error({ error: formattedError }, 'GraphQL error');
            return formattedError;
        },
        introspection: process.env.NODE_ENV !== 'production',
    });
    await apollo.start();
    // Register GraphQL endpoint with Fastify
    await app.register((0, fastify_1.default)(apollo), {
        context: async (request) => {
            // Extract policy headers for context
            return {
                authorityId: request.headers['x-authority-id'],
                reasonForAccess: request.headers['x-reason-for-access'],
            };
        },
    });
    app.log.info('GraphQL server ready at /graphql');
    return apollo;
}
