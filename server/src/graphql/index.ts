import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import type { Express } from 'express';
import express from 'express';

const schema = makeExecutableSchema({ typeDefs, resolvers });

export async function mountGraphQL(app: Express) {
  const server = new ApolloServer({
    schema,
    introspection: true, // Enable in development
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    },
  });

  await server.start();

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        return {
          user: null, // TODO: Extract from JWT token
          req,
        };
      },
    })
  );

  console.log('[GRAPHQL] GraphQL endpoint mounted at /graphql');
}
