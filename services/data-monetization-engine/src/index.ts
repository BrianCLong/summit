/**
 * Data Monetization Engine - Main Entry Point
 *
 * Full-Spectrum Automated Data Monetization Engine
 * AI-powered system for identifying, packaging, and marketing data assets
 * with automated GDPR compliance checks and contract generation
 */

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { postgresConnection } from './db/postgres.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT || '4100');
const SERVICE_NAME = 'data-monetization-engine';

interface Context {
  user?: { id: string; email: string; role: string };
  tenantId: string;
  requestId: string;
}

async function startServer() {
  logger.info({ service: SERVICE_NAME }, 'Starting Data Monetization Engine');

  const app = express();
  const httpServer = createServer(app);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
    }),
  );

  // General middleware
  app.use(compression());
  app.use(json({ limit: '10mb' }));

  // Health endpoints
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', async (req, res) => {
    const dbHealth = await postgresConnection.healthCheck();
    res.json({
      status: dbHealth.status === 'healthy' ? 'ready' : 'not_ready',
      checks: { database: dbHealth },
    });
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP data_monetization_requests_total Total API requests
# TYPE data_monetization_requests_total counter
data_monetization_requests_total{service="${SERVICE_NAME}"} 0

# HELP data_monetization_up Service up status
# TYPE data_monetization_up gauge
data_monetization_up{service="${SERVICE_NAME}"} 1
    `.trim());
  });

  // Create Apollo Server
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      logger.error({ error: error.message, path: error.path }, 'GraphQL error');
      return error;
    },
  });

  await server.start();

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }): Promise<Context> => {
        const requestId =
          (req.headers['x-request-id'] as string) ||
          Math.random().toString(36).substring(2, 15);

        // Extract user from auth header (simplified - use proper JWT verification in production)
        const authHeader = req.headers.authorization;
        let user: Context['user'];
        if (authHeader?.startsWith('Bearer ')) {
          // In production, verify JWT and extract claims
          user = { id: 'user-1', email: 'user@example.com', role: 'admin' };
        }

        const tenantId = (req.headers['x-tenant-id'] as string) || 'default';

        return { user, tenantId, requestId };
      },
    }),
  );

  // API info endpoint
  app.get('/api/info', (req, res) => {
    res.json({
      service: SERVICE_NAME,
      version: '0.1.0',
      description: 'Full-Spectrum Automated Data Monetization Engine',
      capabilities: [
        'Automated data asset discovery',
        'Multi-framework compliance checking (GDPR, CCPA, HIPAA, etc.)',
        'AI-powered data valuation',
        'Automated contract generation',
        'Data marketplace operations',
        'Revenue analytics and reporting',
      ],
      endpoints: {
        graphql: '/graphql',
        health: '/health',
        metrics: '/metrics',
      },
    });
  });

  // Connect to database
  try {
    await postgresConnection.connect();
  } catch (error) {
    logger.warn({ error }, 'Database connection failed - running in standalone mode');
  }

  // Start server
  httpServer.listen(PORT, () => {
    logger.info({
      message: 'Data Monetization Engine started',
      port: PORT,
      graphqlPath: '/graphql',
      environment: process.env.NODE_ENV || 'development',
    });

    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║         DATA MONETIZATION ENGINE - STARTED SUCCESSFULLY            ║
╠════════════════════════════════════════════════════════════════════╣
║  GraphQL Playground: http://localhost:${PORT}/graphql                  ║
║  Health Check:       http://localhost:${PORT}/health                   ║
║  API Info:           http://localhost:${PORT}/api/info                 ║
╠════════════════════════════════════════════════════════════════════╣
║  CAPABILITIES:                                                     ║
║  • Automated Data Asset Discovery                                  ║
║  • Multi-Framework Compliance (GDPR, CCPA, HIPAA, etc.)           ║
║  • AI-Powered Data Valuation                                       ║
║  • Automated Contract Generation                                   ║
║  • Data Marketplace Operations                                     ║
║  • Revenue Analytics & Reporting                                   ║
╚════════════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await server.stop();
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
