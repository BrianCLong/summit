import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger.js';
import { productRoutes } from './routes/products.js';
import { transactionRoutes } from './routes/transactions.js';
import { consentRoutes } from './routes/consent.js';
import { providerRoutes } from './routes/providers.js';
import { riskRoutes } from './routes/risk.js';
import { healthRoutes } from './routes/health.js';
import { reviewRoutes } from './routes/reviews.js';
import { accessRoutes } from './routes/access.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiters } from './middleware/rateLimit.js';
import { metricsMiddleware, MetricNames, metrics } from './utils/metrics.js';

const app = express();
const PORT = process.env.PORT || 4100;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Metrics and request logging
app.use(metricsMiddleware());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });
  next();
});

// Health check (no auth, no rate limit)
app.use('/health', healthRoutes);

// API routes with auth and rate limiting
app.use('/api/v1/products', rateLimiters.api, authMiddleware, productRoutes);
app.use('/api/v1/transactions', rateLimiters.transactions, authMiddleware, transactionRoutes);
app.use('/api/v1/consent', rateLimiters.api, authMiddleware, consentRoutes);
app.use('/api/v1/providers', rateLimiters.api, authMiddleware, providerRoutes);
app.use('/api/v1/risk', rateLimiters.api, authMiddleware, riskRoutes);
app.use('/api/v1/reviews', rateLimiters.api, authMiddleware, reviewRoutes);
app.use('/api/v1/access', rateLimiters.api, authMiddleware, accessRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Marketplace service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
