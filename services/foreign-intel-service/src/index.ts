import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { agenciesRouter } from './routes/agencies.js';
import { capabilitiesRouter } from './routes/capabilities.js';
import { cooperationRouter } from './routes/cooperation.js';

/**
 * Foreign Intelligence Service Monitoring
 *
 * API for tracking foreign intelligence agencies, organizational structures,
 * capabilities, and cooperation relationships.
 */

export async function createApp(): Promise<Application> {
  const app = express();

  // Security and performance middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'foreign-intel-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API routes
  app.use('/api/agencies', agenciesRouter);
  app.use('/api/capabilities', capabilitiesRouter);
  app.use('/api/cooperation', cooperationRouter);

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

// Start server
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 4101;
  createApp().then(app => {
    app.listen(port, () => {
      console.log(`Foreign Intel Service listening on port ${port}`);
    });
  }).catch(err => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });
}
