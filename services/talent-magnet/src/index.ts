import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger.js';
import { talentRouter } from './routes/talents.js';

const PORT = parseInt(process.env.TALENT_MAGNET_PORT || '4050', 10);
const HOST = process.env.TALENT_MAGNET_HOST || '0.0.0.0';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'talent-magnet',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'live' });
});

// API routes
app.use('/api/v1/talents', talentRouter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Global Talent Magnet AI',
    description:
      'Recognize talent signals, offer personalized incentives, and accelerate onboarding',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      talents: '/api/v1/talents',
      match: '/api/v1/talents/match',
      stats: '/api/v1/talents/stats/summary',
    },
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  logger.info(
    { port: PORT, host: HOST },
    'Global Talent Magnet AI service started',
  );
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app };
