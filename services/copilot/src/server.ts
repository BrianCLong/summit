/**
 * Copilot Service Server
 *
 * Main entry point for the AI Copilot NL → Cypher/SQL service.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';

import { CopilotService, StubPolicyEngine, MockQueryExecutor } from './CopilotService.js';
import { MockLlmAdapter } from './LlmAdapter.js';
import { SafetyAnalyzer } from './SafetyAnalyzer.js';
import { InMemoryDraftQueryRepository, InMemoryAuditLog } from './repositories.js';
import {
  createCopilotRouter,
  createDefaultUserContext,
  createDefaultSchemaResolver,
  createDefaultPolicyResolver,
} from './routes.js';

// =============================================================================
// Logger
// =============================================================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// =============================================================================
// Create Express App
// =============================================================================

function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
      });
    });
    next();
  });

  // Initialize service dependencies
  const llmAdapter = new MockLlmAdapter();
  const safetyAnalyzer = new SafetyAnalyzer();
  const draftRepository = new InMemoryDraftQueryRepository();
  const auditLog = new InMemoryAuditLog();
  const policyEngine = new StubPolicyEngine();
  const queryExecutor = new MockQueryExecutor();

  // Create copilot service
  const copilotService = new CopilotService(
    llmAdapter,
    safetyAnalyzer,
    draftRepository,
    auditLog,
    policyEngine,
    queryExecutor,
    {
      defaultDialect: 'CYPHER',
      draftExpirationMs: 30 * 60 * 1000, // 30 minutes
      maxDraftsPerUser: 20,
      requireConfirmation: true,
      allowSafetyOverride: true,
      privilegedRoles: ['ADMIN', 'SUPERVISOR', 'LEAD'],
    },
  );

  // Create router with context resolvers
  const copilotRouter = createCopilotRouter({
    copilotService,
    getUser: createDefaultUserContext,
    getSchema: createDefaultSchemaResolver(),
    getPolicy: createDefaultPolicyResolver(),
  });

  // Mount routes
  app.use('/copilot', copilotRouter);

  // Root health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'copilot',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.path}`,
      },
    });
  });

  // Global error handler
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ error: error.message, stack: error.stack }, 'Unhandled error');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : error.message,
      },
    });
  });

  return app;
}

// =============================================================================
// Start Server
// =============================================================================

const PORT = parseInt(process.env.PORT || '8003', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

app.listen(PORT, HOST, () => {
  logger.info(`Copilot service listening on ${HOST}:${PORT}`);
  logger.info('Endpoints:');
  logger.info(`  POST ${HOST}:${PORT}/copilot/preview  - Generate draft query`);
  logger.info(`  POST ${HOST}:${PORT}/copilot/execute  - Execute confirmed draft`);
  logger.info(`  GET  ${HOST}:${PORT}/copilot/draft/:id - Get draft by ID`);
  logger.info(`  GET  ${HOST}:${PORT}/copilot/drafts   - Get user's drafts`);
  logger.info(`  DELETE ${HOST}:${PORT}/copilot/draft/:id - Delete draft`);
  logger.info(`  GET  ${HOST}:${PORT}/copilot/health   - Health check`);
});

export { createApp };
