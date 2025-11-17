import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { policyGuard } from './middleware/policy.js';
import { createContext } from './context.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  const app = express();

  // Security middleware
  // app.use(helmet());
  // app.use(compression());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    }),
  );

  // Policy enforcement middleware
  app.use(
    '/graphql',
    policyGuard({
      dryRun: process.env.POLICY_DRY_RUN === 'true',
    }),
  );

  // Apollo GraphQL Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: NODE_ENV === 'development',
    logger: logger as any,
  });

  await server.start();

  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.listen(PORT, () => {
    logger.info(`🚀 API Gateway ready at http://localhost:${PORT}/graphql`);
    logger.info(`🏥 Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
