"use strict";
// @ts-nocheck
/**
 * Apollo Server v5 Configuration for IntelGraph Platform
 * Modern GraphQL server with enhanced security and observability
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApolloV5Server = createApolloV5Server;
exports.createGraphQLMiddleware = createGraphQLMiddleware;
exports.createHealthCheck = createHealthCheck;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const default_1 = require("@apollo/server/plugin/landingPage/default");
const schema_1 = require("@graphql-tools/schema");
const shield_js_1 = require("./shield.js");
const graphql_middleware_js_1 = require("./graphql-middleware.js");
const node_crypto_1 = require("node:crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Import schemas and resolvers
const index_js_1 = require("./schema/index.js");
const resolvers_combined_js_1 = __importDefault(require("./resolvers-combined.js"));
const authDirective_js_1 = require("./authDirective.js");
// Import DataLoaders
const index_js_2 = require("./dataloaders/index.js");
const neo4j_js_1 = require("../db/neo4j.js");
const postgres_js_1 = require("../db/postgres.js");
const database_js_1 = require("../config/database.js");
// Import performance optimization plugins
const queryComplexityPlugin_js_1 = require("./plugins/queryComplexityPlugin.js");
const inputSanitizationPlugin_js_1 = require("./plugins/inputSanitizationPlugin.js");
const apqPlugin_js_1 = require("./plugins/apqPlugin.js");
const performanceMonitoringPlugin_js_1 = require("./plugins/performanceMonitoringPlugin.js");
const circuitBreakerPlugin_js_1 = require("./plugins/circuitBreakerPlugin.js");
const graphqlCostPlugin_js_1 = require("./plugins/graphqlCostPlugin.js");
const resolverMetrics_js_1 = __importDefault(require("./plugins/resolverMetrics.js"));
const graphql_depth_limit_1 = __importDefault(require("graphql-depth-limit"));
const reliability_metrics_js_1 = require("../observability/reliability-metrics.js");
// GraphQL Shield Security Rules
const permissions = (0, shield_js_1.shield)({
    Query: {
        // Public queries
        health: true,
        version: true,
        // Protected queries require authentication
        '*': (parent, args, context) => {
            return !!context.user;
        },
    },
    Mutation: {
        // All mutations require authentication
        '*': (parent, args, context) => {
            return !!context.user;
        },
    },
});
// Create enhanced GraphQL schema with security
function createSecureSchema() {
    let schema = (0, schema_1.makeExecutableSchema)({
        typeDefs: index_js_1.typeDefs,
        resolvers: resolvers_combined_js_1.default,
    });
    // Apply Auth Directive
    schema = (0, authDirective_js_1.authDirectiveTransformer)(schema);
    // Apply Scope Directive
    schema = (0, authDirective_js_1.scopeDirectiveTransformer)(schema);
    // Apply security middleware
    return (0, graphql_middleware_js_1.applyMiddleware)(schema, permissions);
}
// Context function for Apollo v5
async function createContext({ req }) {
    const neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
    const pgPool = (0, postgres_js_1.getPostgresPool)();
    const redis = (0, database_js_1.getRedisClient)();
    const tenantId = req.user?.tenantId || req.user?.tenant || 'default';
    // Checkout client for RLS
    let pgClient;
    try {
        pgClient = await pgPool.connect();
        // Set tenant context for RLS
        // Use set_config with is_local=false to set for session duration (until release)
        await pgClient.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
    }
    catch (error) {
        logger_js_1.default.error('Failed to initialize Postgres client for request context', error);
        if (pgClient)
            pgClient.release();
        pgClient = undefined;
    }
    // Create request-scoped DataLoaders to batch queries
    const loaders = (0, index_js_2.createDataLoaders)({
        neo4jDriver,
        pgPool,
        pgClient,
        redis,
        tenantId,
    });
    return {
        dataSources: {
        // Data sources will be injected here
        },
        loaders, // DataLoaders for batch loading
        pgClient,
        user: req.user, // Populated by auth middleware
        request: {
            ip: req.ip || req.connection.remoteAddress,
            headers: req.headers,
            userAgent: req.get('User-Agent'),
        },
        telemetry: {
            traceId: req.headers?.['x-trace-id'] || req.headers?.['traceparent'] || (0, node_crypto_1.randomUUID)(),
            spanId: 'unknown',
        },
    };
}
// Apollo Server v5 factory
function createApolloV5Server(httpServer) {
    const schema = createSecureSchema();
    const server = new server_1.ApolloServer({
        schema,
        validationRules: [
            // Recursion and Depth limiting against deep query abuse
            (0, graphql_depth_limit_1.default)(10),
        ],
        plugins: [
            // Graceful shutdown
            (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
            // Enhanced landing page for development
            ...(process.env.NODE_ENV === 'development'
                ? [(0, default_1.ApolloServerPluginLandingPageLocalDefault)({ embed: true })]
                : []),
            // Input Sanitization Plugin (Injection & Recursive Input Abuse)
            (0, inputSanitizationPlugin_js_1.createInputSanitizationPlugin)({
                maxInputDepth: 10,
                maxStringLength: 10000,
                trimStrings: true,
                removeNullBytes: true,
            }),
            // GraphQL Cost Analysis & Rate Limiting Plugin (NEW)
            // This replaces the simpler complexity plugin with full per-tenant cost tracking
            (0, graphqlCostPlugin_js_1.createProductionGraphQLCostPlugin)(),
            // Performance optimization plugins
            // Note: Keeping legacy complexity plugin for backwards compatibility
            // Can be removed once cost plugin is fully validated
            (0, queryComplexityPlugin_js_1.createQueryComplexityPlugin)({
                maximumComplexity: 1000,
                getMaxComplexityForUser: queryComplexityPlugin_js_1.getMaxComplexityByRole,
                enforceComplexity: false, // Disabled in favor of cost plugin
                logComplexity: false,
            }),
            (0, apqPlugin_js_1.createAPQPlugin)({
                // Redis will be injected if available
                enabled: process.env.ENABLE_APQ !== 'false',
                ttl: 86400, // 24 hours
                allowlistEnabled: process.env.NODE_ENV === 'production',
            }),
            (0, circuitBreakerPlugin_js_1.createCircuitBreakerPlugin)({
                failureThreshold: 20,
                resetTimeout: 30000,
                maxRequestsPerMinute: 2000,
            }),
            (0, performanceMonitoringPlugin_js_1.createPerformanceMonitoringPlugin)(),
            resolverMetrics_js_1.default,
            // RLS Cleanup Plugin
            {
                async requestDidStart() {
                    return {
                        async willSendResponse(requestContext) {
                            if (requestContext.contextValue?.pgClient) {
                                requestContext.contextValue.pgClient.release();
                            }
                        }
                    };
                }
            },
            // Custom telemetry plugin
            {
                async requestDidStart(requestContext) {
                    const start = process.hrtime();
                    return {
                        async didResolveOperation(requestContext) {
                            const operationName = requestContext.request.operationName;
                            logger_js_1.default.info({
                                operationName,
                                query: requestContext.request.query,
                                variables: requestContext.request.variables,
                            }, 'GraphQL operation started');
                        },
                        async didEncounterErrors(requestContext) {
                            logger_js_1.default.error({
                                errors: requestContext.errors,
                                operationName: requestContext.request.operationName,
                            }, 'GraphQL operation failed');
                        },
                        async willSendResponse(requestContext) {
                            const { response } = requestContext;
                            const body = response.body;
                            const hasErrors = !!(body.singleResult?.errors?.length || (body.kind === 'single' && body.singleResult?.errors?.length));
                            const [seconds, nanoseconds] = process.hrtime(start);
                            const duration = seconds + nanoseconds / 1e9;
                            const tenantId = requestContext.contextValue?.user?.tenantId || 'unknown';
                            (0, reliability_metrics_js_1.recordEndpointResult)({
                                endpoint: 'graph_query',
                                statusCode: hasErrors ? 500 : 200,
                                durationSeconds: duration,
                                tenantId
                            });
                            logger_js_1.default.info({
                                operationName: requestContext.request.operationName,
                                hasErrors,
                                duration,
                            }, 'GraphQL operation completed');
                        },
                    };
                },
            },
        ],
        // Enhanced error formatting
        formatError: (formattedError, error) => {
            // Log internal errors
            logger_js_1.default.error({
                error: formattedError,
                originalError: error,
            }, 'GraphQL error occurred');
            // Don't expose internal errors in production
            if (process.env.NODE_ENV === 'production') {
                return {
                    message: formattedError.message,
                    locations: formattedError.locations,
                    path: formattedError.path,
                    extensions: {
                        code: formattedError.extensions?.code,
                    },
                };
            }
            return formattedError;
        },
        // Disable introspection and playground in production
        introspection: process.env.NODE_ENV !== 'production',
        // Include stack traces in development
        includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    });
    return server;
}
// Express middleware factory for Apollo v5
function createGraphQLMiddleware(server) {
    return (0, express4_1.expressMiddleware)(server, {
        context: createContext,
        // Enhanced CORS configuration
        cors: {
            origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'Apollo-Require-Preflight',
                'X-Tenant-ID',
                'X-User-ID',
            ],
        },
    });
}
// Health check endpoint for Apollo v5
function createHealthCheck(server) {
    return async (req, res) => {
        try {
            // Simple GraphQL health query
            const result = await server.executeOperation({
                query: 'query Health { __typename }',
            }, { contextValue: await createContext({ req }) });
            if (result.body.kind === 'single' && !result.body.singleResult.errors) {
                res.status(200).json({
                    status: 'healthy',
                    service: 'apollo-v5-graphql',
                    timestamp: new Date().toISOString(),
                });
            }
            else {
                const body = result.body;
                res.status(503).json({
                    status: 'unhealthy',
                    service: 'apollo-v5-graphql',
                    errors: body.singleResult?.errors || (body.kind === 'single' ? body.singleResult?.errors : []),
                });
            }
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                service: 'apollo-v5-graphql',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
}
