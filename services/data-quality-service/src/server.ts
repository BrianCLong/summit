/**
 * Data Quality Service
 *
 * Production-ready REST API service for data quality operations
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { config, isProduction } from './config.js';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  UnauthorizedError,
} from './middleware/error-handler.js';
import { createQualityRouter } from './routes/quality.js';
import { createProfilingRouter } from './routes/profiling.js';
import { createValidationRouter } from './routes/validation.js';
import { createRemediationRouter } from './routes/remediation.js';

// Initialize logger
const logger = pino({
  name: 'data-quality-service',
  level: config.logging.level,
  transport: config.logging.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Initialize database pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis,
});

// Test database connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
  process.exit(1);
});

/**
 * Create and configure Express application
 */
function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    })
  );

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.api.rateLimit.windowMs,
    max: config.api.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter as any);

  // Authentication middleware (stub)
  const authMiddleware = (req: Request, res: Response, next: Function) => {
    if (!config.auth.enabled) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    // TODO: Implement JWT verification
    // const token = authHeader.substring(7);
    // Verify token and attach user to request

    next();
  };

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    try {
      // Check database connection
      await pool.query('SELECT 1');

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
        database: 'connected',
      });
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Readiness check endpoint
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({ status: 'not ready' });
    }
  });

  // Liveness check endpoint
  app.get('/live', (req: Request, res: Response) => {
    res.json({ status: 'alive' });
  });

  // API routes
  app.use(`${config.api.prefix}/quality`, authMiddleware, createQualityRouter(pool));
  app.use(`${config.api.prefix}/profiling`, authMiddleware, createProfilingRouter(pool));
  app.use(`${config.api.prefix}/validation`, authMiddleware, createValidationRouter(pool));
  app.use(`${config.api.prefix}/remediation`, authMiddleware, createRemediationRouter(pool));

  // Swagger/OpenAPI documentation
  if (config.swagger.enabled) {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Data Quality Service API',
          version: '1.0.0',
          description: 'REST API for comprehensive data quality operations',
          contact: {
            name: 'Summit Team',
            email: 'support@summit.com',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.port}${config.api.prefix}`,
            description: 'Development server',
          },
          {
            url: `https://api.summit.com${config.api.prefix}`,
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
        security: config.auth.enabled
          ? [
              {
                bearerAuth: [],
              },
            ]
          : [],
        tags: [
          {
            name: 'Quality',
            description: 'Quality assessment and scoring operations',
          },
          {
            name: 'Profiling',
            description: 'Data profiling and analysis operations',
          },
          {
            name: 'Validation',
            description: 'Data validation and rule management',
          },
          {
            name: 'Remediation',
            description: 'Data quality remediation operations',
          },
        ],
      },
      apis: ['./src/routes/*.ts'],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use(config.swagger.path, swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);
    logger.info({ path: config.swagger.path }, 'Swagger documentation enabled');
  }

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connection verified');

    const app = createApp();

    const server = app.listen(config.port, config.host, () => {
      logger.info(
        {
          port: config.port,
          host: config.host,
          environment: config.nodeEnv,
          apiPrefix: config.api.prefix,
        },
        'Data Quality Service started successfully'
      );

      if (config.swagger.enabled) {
        logger.info(
          `API documentation available at http://${config.host}:${config.port}${config.swagger.path}`
        );
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await pool.end();
          logger.info('Database pool closed');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error({ err: error }, 'Uncaught exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

// Export for testing
export { createApp, startServer, pool };
