import express from 'express';
import pino from 'pino';
import citizenRoutes from './routes/citizen.js';
import { createHealthRouter } from './middleware/health.js';
import { metricsMiddleware, metricsCollector } from './middleware/metrics.js';
import { cacheService } from './services/CacheService.js';

const logger = pino({
  name: 'citizen-service',
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();
const PORT = process.env.PORT || 4010;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(metricsMiddleware);

// Request logging
app.use((req, res, next) => {
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

// Health routes
app.use(createHealthRouter());

// Prometheus metrics endpoint
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.getPrometheusMetrics());
});

// JSON metrics endpoint
app.get('/metrics/json', (_req, res) => {
  res.json(metricsCollector.getMetrics());
});

// API routes
app.use('/api/v1', citizenRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down gracefully');

  try {
    await cacheService.disconnect();
    logger.info('Cache disconnected');
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start(): Promise<void> {
  try {
    // Connect to cache (optional, continues without it)
    await cacheService.connect();

    app.listen(PORT, () => {
      logger.info(`Citizen Service running on port ${PORT}`);
      logger.info('Real-time citizen-centric service automation enabled');
      logger.info({
        endpoints: {
          health: '/health',
          healthLive: '/health/live',
          healthReady: '/health/ready',
          metrics: '/metrics',
          api: '/api/v1',
        },
      });
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
