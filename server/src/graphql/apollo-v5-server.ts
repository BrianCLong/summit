/**
 * Apollo Server v5 Configuration for IntelGraph Platform
 * Modern GraphQL server with enhanced security and observability
 */

import { ApolloServer } from '@apollo/server';
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
import { licenseRuleValidationMiddleware } from './middleware/licenseRuleValidationMiddleware.js';

// Enhanced context type for Apollo v5
export interface GraphQLContext {
  dataSources: any;
  loaders: DataLoaders;
  user?: {
    id: string;
    roles: string[];
    tenantId: string;
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
});

// Create enhanced GraphQL schema with security
function createSecureSchema() {
  const baseSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apply security middleware
  return applyMiddleware(baseSchema, permissions, licenseRuleValidationMiddleware);
}

// Context function for Apollo v5
async function createContext({ req }: { req: any }): Promise<GraphQLContext> {
  const neo4jDriver = getNeo4jDriver();
  const pgPool = getPostgresPool();
  const tenantId = req.user?.tenantId || req.user?.tenant || 'default';

  // Create request-scoped DataLoaders to batch queries
  const loaders = createDataLoaders({
    neo4jDriver,
    pgPool,
    tenantId,
  });

  return {
    dataSources: {
      // Data sources will be injected here
    },
    loaders, // DataLoaders for batch loading
    user: req.user, // Populated by auth middleware
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
  httpServer: any,
): ApolloServer<GraphQLContext> {
  const schema = createSecureSchema();

  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      // Graceful shutdown
      ApolloServerPluginDrainHttpServer({ httpServer }),

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
    ],

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
export function createGraphQLMiddleware(server: ApolloServer<GraphQLContext>) {
  return expressMiddleware(server, {
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
    } as cors.CorsOptions,
  });
}

// Health check endpoint for Apollo v5
export function createHealthCheck(server: ApolloServer<GraphQLContext>) {
  return async (req: any, res: any) => {
    try {
      // Simple GraphQL health query
      const result = await server.executeOperation(
        {
          query: 'query Health { __typename }',
        },
        { contextValue: await createContext({ req }) },
      );

      if (result.body.kind === 'single' && !result.body.singleResult.errors) {
        res.status(200).json({
          status: 'healthy',
          service: 'apollo-v5-graphql',
          timestamp: new Date().toISOString(),
        });
      } else {
        const body = result.body as any;
        res.status(503).json({
          status: 'unhealthy',
          service: 'apollo-v5-graphql',
          errors: body.singleResult?.errors || (body.kind === 'single' ? body.singleResult?.errors : []),
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'apollo-v5-graphql',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
