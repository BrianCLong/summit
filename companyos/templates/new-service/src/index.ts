/**
 * CompanyOS Service Template - Main Entry Point
 * Implements D2: Paved Road Template v2
 *
 * Pre-wired with:
 * - OPA authorization
 * - Tenant context
 * - Metrics collection
 * - Health endpoints
 * - Rate limiting
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { metricsMiddleware, metricsHandler } from './middleware/metrics.js';
import { healthRoutes } from './routes/health.js';
import { exampleRoutes } from './routes/example.js';

// Create Express app
const app: Application = express();

// ============================================================================
// MIDDLEWARE STACK
// ============================================================================

// JSON parsing
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      tenantId: (req as any).tenantContext?.tenantId,
    });
  });
  next();
});

// Metrics collection
app.use(metricsMiddleware);

// Health endpoints (no auth required)
app.use('/health', healthRoutes);

// Metrics endpoint (no auth required in dev)
app.get('/metrics', metricsHandler);

// ============================================================================
// PROTECTED ROUTES
// ============================================================================

// Authentication & tenant context
app.use(authMiddleware);
app.use(tenantMiddleware);

// Application routes
app.use('/api/v1', exampleRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.port;

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: config.nodeEnv,
    opaUrl: config.opaUrl,
  });
});

export { app };
