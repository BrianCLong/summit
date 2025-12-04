/**
 * GraphQL Server Setup for Graph Core
 *
 * Configures Apollo Server with the canonical graph model schema and resolvers.
 *
 * @module graph-core/graphql
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Application } from 'express';
import { resolvers } from './resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read schema from file
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

// Build executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

/**
 * GraphQL context type
 */
export interface GraphQLContext {
  /** Current user ID */
  userId?: string;
  /** Current tenant ID */
  tenantId?: string;
  /** User clearance level */
  clearance?: string;
  /** Request correlation ID */
  correlationId?: string;
}

/**
 * Create Apollo Server instance
 */
export function createApolloServer(): ApolloServer<GraphQLContext> {
  return new ApolloServer<GraphQLContext>({
    schema,
    introspection: process.env.NODE_ENV !== 'production',
    formatError: (formattedError, error) => {
      // Log error in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('[GraphQL Error]', error);
      }

      // Don't expose internal errors in production
      if (
        process.env.NODE_ENV === 'production' &&
        formattedError.message.startsWith('Internal server error')
      ) {
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
export async function setupGraphQL(app: Application): Promise<void> {
  const server = createApolloServer();

  // Start server
  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Extract context from headers
        const userId = req.headers['x-user-id'] as string | undefined;
        const tenantId = req.headers['x-tenant-id'] as string | undefined;
        const clearance = req.headers['x-clearance'] as string | undefined;
        const correlationId = req.headers['x-correlation-id'] as string | undefined;

        return {
          userId,
          tenantId,
          clearance,
          correlationId,
        };
      },
    })
  );

  console.log('GraphQL endpoint available at /graphql');
}

// Export schema for testing and tooling
export { typeDefs, resolvers, schema };
