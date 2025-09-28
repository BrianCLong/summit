/**
 * IntelGraph API Application Setup
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { json } from 'body-parser';
import { createServer } from 'http';

import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers/index.js';
import { persistedGuard } from './graphql/persisted.js';
import { createContext } from './graphql/context.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { auditMiddleware } from './middleware/audit.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { logger } from './utils/logger.js';
import { ingestRouter } from './routes/ingest.js';
import { copilotRouter } from './routes/copilot.js';
import { adminRouter } from './routes/admin.js';
import { casesRouter } from './routes/cases.js';
import { evidenceRouter } from './routes/evidence.js';
import { analyticsExtRouter } from './routes/analytics_ext.js';
import { triageRouter } from './routes/triage.js';

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    }),
  );

  // General middleware
  app.use(compression());
  app.use(json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Metrics endpoint for monitoring
  app.get('/metrics', (req, res) => {
    // TODO: Implement Prometheus metrics
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Ingest wizard API (scaffold)
  app.use('/ingest', ingestRouter);
  // Copilot utility
  app.use('/copilot', copilotRouter);
  // Admin console
  app.use('/admin', adminRouter);
  // Cases
  app.use('/cases', casesRouter);
  // Evidence
  app.use('/evidence', evidenceRouter);
  // Analytics expansion
  app.use('/analytics', analyticsExtRouter);
  // Triage queue
  app.use('/triage', triageRouter);

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (error) => {
      logger.error({
        message: 'GraphQL Error',
        error: error.message,
        path: error.path,
        extensions: error.extensions,
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return new Error('An internal error occurred');
        }
      }

      return error;
    },
  });

  // Start Apollo Server
  await server.start();

  // Basic GraphQL guard: require operationName (optional) and limit naive complexity by brace count
  function graphGuard(req: any, res: any, next: any){
    try{
      if(req.method === 'POST'){
        const body = req.body || {};
        if(process.env.ENFORCE_GRAPHQL_OPNAME === 'true' && !body.operationName){
          return res.status(400).json({ error:'operation_name_required' });
        }
        const q = String(body.query||'');
        const braces = (q.match(/[{}]/g)||[]).length;
        const maxBraces = Number(process.env.GQL_MAX_BRACES || '200');
        if(braces > maxBraces) return res.status(400).json({ error:'query_too_complex' });
      }
    }catch{}
    next();
  }

  // Apply GraphQL middleware with authentication and tenant isolation
  app.post('/graphql', persistedGuard);
  app.use(
    '/graphql',
    graphGuard,
    rateLimitMiddleware,
    authMiddleware,
    tenantMiddleware,
    auditMiddleware,
    expressMiddleware(server, {
      context: createContext,
    }),
  );

  return app;
}
