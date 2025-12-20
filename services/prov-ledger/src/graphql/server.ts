/**
 * GraphQL Server for Provenance & Claims Ledger
 * Integrates with Fastify REST service
 */

import { FastifyInstance } from 'fastify';
import { ApolloServer } from '@apollo/server';
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from '@as-integrations/fastify';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { resolvers, setDatabasePool } from './resolvers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GraphQLContext {
  authorityId?: string;
  reasonForAccess?: string;
}

export async function setupGraphQL(
  app: FastifyInstance,
  pool: Pool,
): Promise<ApolloServer<GraphQLContext>> {
  // Set database pool for resolvers
  setDatabasePool(pool);

  // Load schema
  const typeDefs = readFileSync(
    join(__dirname, '../schema.graphql'),
    'utf-8',
  );

  // Create Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [
      fastifyApolloDrainPlugin(app),
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
  await app.register(fastifyApollo(apollo), {
    context: async (request) => {
      // Extract policy headers for context
      return {
        authorityId: request.headers['x-authority-id'] as string,
        reasonForAccess: request.headers['x-reason-for-access'] as string,
      };
    },
  });

  app.log.info('GraphQL server ready at /graphql');

  return apollo;
}
