import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import { resolvers } from './resolvers';

const logger = pino({ name: 'supply-chain-service' });

const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({
      tenantId: req.headers['x-tenant-id'] || 'default',
      userId: req.headers['x-user-id'],
      logger,
    }),
    introspection: true,
    formatError: (error) => {
      logger.error({ error }, 'GraphQL error');
      return error;
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    logger.info(
      `🚀 Supply Chain Service ready at http://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
