import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { operationsRouter } from './routes/operations.js';
import { agentsRouter } from './routes/agents.js';
import { analyticsRouter } from './routes/analytics.js';
import { ciRouter } from './routes/counterintel.js';

/**
 * Espionage Intelligence Service
 *
 * Comprehensive API for espionage operations, agent tracking,
 * and counterintelligence management.
 */

export async function createApp(): Promise<Application> {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // Performance middleware
  app.use(compression());

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'espionage-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API routes
  app.use('/api/operations', operationsRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/counterintel', ciRouter);

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  return app;
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 4100;
  createApp().then(app => {
    app.listen(port, () => {
      console.log(`Espionage Service listening on port ${port}`);
    });
  }).catch(err => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });
}
