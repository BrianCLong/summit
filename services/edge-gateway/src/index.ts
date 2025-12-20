import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { metricsMiddleware } from './middleware/metrics';

const logger = pino({ name: 'edge-gateway' });

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Logging
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Metrics collection
app.use(metricsMiddleware);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Apply authentication to all /api routes
app.use('/api', authMiddleware);

// Proxy to edge orchestrator
app.use(
  '/api/orchestrator',
  createProxyMiddleware({
    target: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: {
      '^/api/orchestrator': '/api'
    },
    onError: (err, req, res) => {
      logger.error({ err }, 'Proxy error');
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to connect to orchestrator service'
      });
    }
  })
);

// WebSocket support for real-time updates
app.use(
  '/ws',
  createProxyMiddleware({
    target: process.env.ORCHESTRATOR_URL || 'http://localhost:8080',
    changeOrigin: true,
    ws: true
  })
);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info({ port }, 'Edge gateway service started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
