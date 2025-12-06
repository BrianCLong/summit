import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { importRoutes } from './routes/import.js';
import { transactionRoutes } from './routes/transactions.js';
import { flowRoutes } from './routes/flows.js';
import { partyRoutes } from './routes/parties.js';
import { accountRoutes } from './routes/accounts.js';
import { healthRoutes } from './routes/health.js';
import { db } from './utils/db.js';

const PORT = parseInt(process.env.PORT || '4200', 10);
const HOST = process.env.HOST || '0.0.0.0';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging
  app.use(requestLogger);

  // Health check routes (no auth required)
  app.use('/health', healthRoutes);

  // Rate limiting
  app.use(rateLimiter);

  // Tenant extraction
  app.use(tenantMiddleware);

  // API routes
  app.use('/api/v1/import', importRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/flows', flowRoutes);
  app.use('/api/v1/parties', partyRoutes);
  app.use('/api/v1/accounts', accountRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

async function main(): Promise<void> {
  logger.info('Starting Finance Normalizer Service...');

  // Verify database connection
  try {
    await db.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  const app = createApp();

  app.listen(PORT, HOST, () => {
    logger.info(`Finance Normalizer Service listening on ${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await db.end();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});
