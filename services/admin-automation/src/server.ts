import express, { Request, Response, NextFunction } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { createContext, type GraphQLContext } from './graphql/context.js';
import { config } from './config.js';

export async function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check - excluded from rate limiting
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'admin-automation',
      version: config.version,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', (_req: Request, res: Response) => {
    res.json({ ready: true });
  });

  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({ live: true });
  });

  // Metrics endpoint
  app.get('/metrics', (_req: Request, res: Response) => {
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: config.isDevelopment,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  return app;
}

export async function startServer() {
  try {
    const app = await createServer();

    app.listen(config.port, () => {
      console.log(`Admin Automation service running on port ${config.port}`);
      console.log(`GraphQL: http://localhost:${config.port}/graphql`);
      console.log(`Health: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
