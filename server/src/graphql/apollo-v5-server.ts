/**
 * Apollo Server v5 Configuration for IntelGraph Platform
 * Modern GraphQL server with enhanced security and observability
 */

import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { shield } from 'graphql-shield';
import { applyMiddleware } from 'graphql-middleware';
import bodyParser from 'body-parser';
import cors from 'cors';
import logger from '../utils/logger.js';

// Import schemas and resolvers
import { typeDefs } from './schema/index.js';
import resolvers from './resolvers-combined.js';

// Import DataLoaders
import { createDataLoaders, type DataLoaders } from './dataloaders/index.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';

// Import performance optimization plugins
import { createQueryComplexityPlugin, getMaxComplexityByRole } from './plugins/queryComplexityPlugin.js';
import { createAPQPlugin } from './plugins/apqPlugin.js';
import { createPerformanceMonitoringPlugin } from './plugins/performanceMonitoringPlugin.js';
import resolverMetricsPlugin from './plugins/resolverMetrics.js';
import auditLoggerPlugin from './plugins/auditLogger.js';
import pbacPlugin from './plugins/pbac.js';
// @ts-ignore: JS file without type definitions
import PersistedQueriesPlugin from './plugins/persistedQueries.js';
import { depthLimit } from './validation/depthLimit.js';

// Enhanced context type for Apollo v5
export interface GraphQLContext {
  dataSources: any;
  loaders: DataLoaders;
  user?: {
    id: string;
    roles?: string[]; // Normalized roles
    role?: string;   // Legacy role
    tenantId: string;
    sub?: string; // JWT sub
    email?: string;
  };
  request: {
    ip: string;
    headers: Record<string, string>;
    userAgent?: string;
  };
  telemetry: {
    traceId: string;
    spanId: string;
  };
  audit?: {
      before?: any;
      after?: any;
  };
  isAuthenticated: boolean;
  requestId?: string;
}

// GraphQL Shield Security Rules
const permissions = shield({
  Query: {
    // Public queries
    health: true,
    version: true,
    // Protected queries require authentication
    '*': (parent, args, context: GraphQLContext) => {
      return !!context.user;
    },
  },
  Mutation: {
    // All mutations require authentication
    '*': (parent, args, context: GraphQLContext) => {
      return !!context.user;
    },
  },
}, { allowExternalErrors: true }); // Allow external errors to pass through

// Create enhanced GraphQL schema with security
function createSecureSchema() {
  const baseSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apply security middleware
  return applyMiddleware(baseSchema, permissions);
}

// Context function for Apollo v5
async function createContext({ req, res }: { req: any, res: any }): Promise<GraphQLContext> {
  const neo4jDriver = getNeo4jDriver();
  const pgPool = getPostgresPool();
  // Support multiple tenant ID locations
  const tenantId = req.user?.tenantId || req.user?.tenant || req.headers['x-tenant-id'] || 'default';

  // Create request-scoped DataLoaders to batch queries
  const loaders = createDataLoaders({
    neo4jDriver,
    pgPool,
    tenantId,
  });

  const user = req.user;

  return {
    dataSources: {
      // Data sources will be injected here
    },
    loaders, // DataLoaders for batch loading
    user,
    isAuthenticated: !!user,
    requestId: req.requestId,
    request: {
      ip: req.ip || req.connection.remoteAddress,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
    },
    telemetry: {
      traceId: (req.headers?.['x-trace-id'] as string) || 'unknown',
      spanId: 'unknown',
    },
  };
}

// Apollo Server v5 factory
export function createApolloV5Server(
  httpServer?: any,
): ApolloServer<GraphQLContext> {
  const schema = createSecureSchema();

  // Instantiate PersistedQueriesPlugin
  const persistedQueries = new PersistedQueriesPlugin({
      // In development, we might want to allow non-persisted queries
      allowNonPersisted: process.env.NODE_ENV !== 'production',
  });

  const plugins: ApolloServerPlugin<GraphQLContext>[] = [
      // Enhanced landing page for development
      ...(process.env.NODE_ENV === 'development'
        ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        : []),

      // Performance optimization plugins
      createQueryComplexityPlugin({
        maximumComplexity: 1000,
        getMaxComplexityForUser: getMaxComplexityByRole,
        enforceComplexity: process.env.ENFORCE_QUERY_COMPLEXITY === 'true' || process.env.NODE_ENV === 'production',
        logComplexity: true,
      }),

      createAPQPlugin({
        // Redis will be injected if available
        enabled: process.env.ENABLE_APQ !== 'false',
        ttl: 86400, // 24 hours
      }),

      createPerformanceMonitoringPlugin(),

      resolverMetricsPlugin,

      auditLoggerPlugin,

      // Enable PBAC (Field-level auth)
      pbacPlugin() as any,

      // Persisted Queries Allow-listing
      persistedQueries.apolloServerPlugin(),

      // Custom telemetry plugin
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              const operationName = requestContext.request.operationName;
              logger.info(
                {
                  operationName,
                  query: requestContext.request.query,
                  variables: requestContext.request.variables,
                },
                'GraphQL operation started',
              );
            },

            async didEncounterErrors(requestContext) {
              logger.error(
                {
                  errors: requestContext.errors,
                  operationName: requestContext.request.operationName,
                },
                'GraphQL operation failed',
              );
            },

            async willSendResponse(requestContext) {
              const { response } = requestContext;
              const body = response.body as any;
              logger.info(
                {
                  operationName: requestContext.request.operationName,
                  hasErrors: !!(body.singleResult?.errors?.length || (body.kind === 'single' && body.singleResult?.errors?.length)),
                },
                'GraphQL operation completed',
              );
            },
          };
        },
      },
  ];

  // Only add DrainHttpServer plugin if httpServer is provided
  if (httpServer) {
    plugins.unshift(ApolloServerPluginDrainHttpServer({ httpServer }));
  }

  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins,

    // Enhanced error formatting
    formatError: (formattedError, error) => {
      // Log internal errors
      logger.error(
        {
          error: formattedError,
          originalError: error,
        },
        'GraphQL error occurred',
      );

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        // Allow some errors through if they are safe
        if (formattedError.extensions?.code === 'BAD_USER_INPUT' ||
            formattedError.extensions?.code === 'UNAUTHENTICATED' ||
            formattedError.extensions?.code === 'FORBIDDEN' ||
            formattedError.extensions?.code === 'QUERY_TOO_COMPLEX' ||
            formattedError.extensions?.code === 'PERSISTED_QUERY_NOT_FOUND' ||
            formattedError.extensions?.code === 'PERSISTED_QUERY_NOT_SUPPORTED') {
            return formattedError;
        }

        return {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        };
      }

      return formattedError;
    },

    // Disable introspection and playground in production
    introspection: process.env.NODE_ENV !== 'production',

    // Validation rules including Depth Limiting
    validationRules: [
        depthLimit(process.env.NODE_ENV === 'production' ? 6 : 10)
    ],

    // Include stack traces in development
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  });

  return server;
}

// Express middleware factory for Apollo v5
export function createGraphQLMiddleware(server: ApolloServer<GraphQLContext>) {
  return expressMiddleware(server, {
    context: createContext,
  });
}
