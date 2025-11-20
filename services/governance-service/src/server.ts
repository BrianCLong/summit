/**
 * Governance Service - Main Server
 * REST API for data governance operations
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Pool } from 'pg';
import { DataGovernanceEngine } from '@summit/data-governance';

// Configuration and utilities
import { config, validateConfig, getDatabaseConfig } from './config.js';
import { logger, requestLogger } from './logger.js';

// Middleware
import {
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from './middleware/error-handler.js';
import { optionalAuthenticate } from './middleware/auth.js';

// Routes
import { createPoliciesRouter } from './routes/policies.js';
import { createComplianceRouter } from './routes/compliance.js';
import { createPrivacyRouter } from './routes/privacy.js';
import { createAuditRouter } from './routes/audit.js';

/**
 * Swagger/OpenAPI configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Data Governance API',
      version: config.api.version,
      description: 'REST API for comprehensive data governance operations including policy management, compliance reporting, privacy requests, and audit logging',
      contact: {
        name: 'Summit Team',
        email: 'support@summit.example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}${config.api.basePath}`,
        description: 'Development server',
      },
      {
        url: `https://api.summit.example.com${config.api.basePath}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and service status endpoints',
      },
      {
        name: 'Policies',
        description: 'Policy management and evaluation',
      },
      {
        name: 'Compliance',
        description: 'Compliance framework management and reporting',
      },
      {
        name: 'Privacy',
        description: 'Privacy request workflows (GDPR, CCPA)',
      },
      {
        name: 'Audit',
        description: 'Audit log querying and analytics',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Create and configure Express application
 */
export async function createApp(): Promise<Express> {
  const app: Express = express();

  // Security middleware
  if (config.security.enableHelmet) {
    app.use(helmet({
      contentSecurityPolicy: false, // Disable for Swagger UI
    }));
  }

  // CORS configuration
  app.use(cors({
    origin: config.security.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Database connection pool
  const pool = new Pool(getDatabaseConfig());

  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connection established successfully');
  } catch (error: any) {
    logger.error('Failed to connect to database', { error: error.message });
    throw error;
  }

  // Initialize governance engine
  const governanceEngine = new DataGovernanceEngine(pool);
  logger.info('Data Governance Engine initialized');

  // Health check endpoint (public)
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: healthy
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 version:
   *                   type: string
   *                 uptime:
   *                   type: number
   *                   description: Uptime in seconds
   */
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.api.version,
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // Readiness check endpoint (checks database)
  /**
   * @swagger
   * /ready:
   *   get:
   *     summary: Readiness check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is ready
   *       503:
   *         description: Service is not ready
   */
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  });

  // API documentation (Swagger UI)
  if (config.api.docsEnabled) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Data Governance API Documentation',
    }));
    logger.info(`API documentation available at /api-docs`);
  }

  // API routes
  const apiRouter = express.Router();

  // Mount route modules
  apiRouter.use('/policies', createPoliciesRouter(governanceEngine));
  apiRouter.use('/compliance', createComplianceRouter(governanceEngine));
  apiRouter.use('/privacy', createPrivacyRouter(governanceEngine));
  apiRouter.use('/audit', createAuditRouter(governanceEngine));

  // Mount API router
  app.use(config.api.basePath, apiRouter);

  // Root endpoint
  app.get('/', optionalAuthenticate, (req: Request, res: Response) => {
    res.json({
      service: 'Data Governance Service',
      version: config.api.version,
      description: 'REST API for data governance operations',
      documentation: config.api.docsEnabled ? '/api-docs' : 'disabled',
      health: '/health',
      readiness: '/ready',
      endpoints: {
        policies: `${config.api.basePath}/policies`,
        compliance: `${config.api.basePath}/compliance`,
        privacy: `${config.api.basePath}/privacy`,
        audit: `${config.api.basePath}/audit`,
      },
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  // Store pool on app for cleanup
  (app as any).dbPool = pool;

  return app;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Setup global error handlers
    setupGlobalErrorHandlers();

    // Create and start app
    const app = await createApp();

    const server = app.listen(config.port, config.host, () => {
      logger.info(`Governance Service started`, {
        host: config.host,
        port: config.port,
        environment: config.nodeEnv,
        basePath: config.api.basePath,
        documentation: config.api.docsEnabled ? 'enabled' : 'disabled',
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database pool
        const pool = (app as any).dbPool;
        if (pool) {
          await pool.end();
          logger.info('Database pool closed');
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000); // 30 seconds
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default { createApp, startServer };
