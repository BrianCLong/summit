/**
 * Runbook Engine Service
 *
 * Deployable service wrapper for the runbook orchestration engine.
 * Provides HTTP API, health checks, and graceful shutdown.
 */

import express, { Express } from 'express';
import { RunbookEngine } from './engine';
import { createRunbookAPI } from './api';
import {
  CallServiceExecutor,
  WaitForEventExecutor,
  HumanApprovalExecutor,
  ConditionalExecutor,
  LoopExecutor,
} from './executors';
import { EngineConfig } from './types';

/**
 * Service configuration
 */
export interface ServiceConfig {
  /** Port to listen on */
  port: number;
  /** Engine configuration */
  engine: EngineConfig;
  /** Enable CORS */
  enableCors?: boolean;
  /** Allowed origins for CORS */
  corsOrigins?: string[];
}

/**
 * Runbook Orchestration Service
 */
export class RunbookService {
  private app: Express;
  private engine: RunbookEngine;
  private server: any;
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.app = express();
    this.engine = new RunbookEngine(config.engine);

    // Register standard executors
    this.registerStandardExecutors();

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();
  }

  /**
   * Register standard step executors
   */
  private registerStandardExecutors(): void {
    this.engine.registerExecutor(new CallServiceExecutor());
    this.engine.registerExecutor(new WaitForEventExecutor());
    this.engine.registerExecutor(new HumanApprovalExecutor());
    this.engine.registerExecutor(new ConditionalExecutor());
    this.engine.registerExecutor(new LoopExecutor());
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    if (this.config.enableCors) {
      this.app.use((req, res, next) => {
        const origin = req.headers.origin;
        const allowedOrigins = this.config.corsOrigins || ['*'];

        if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
          res.header('Access-Control-Allow-Origin', origin || '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
        }

        next();
      });
    }

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
        );
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Mount runbook API
    const apiRouter = createRunbookAPI(this.engine);
    this.app.use('/api/v1', apiRouter);

    // Root health check
    this.app.get('/', (req, res) => {
      res.json({
        service: 'runbook-orchestration-engine',
        version: '1.0.0',
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    // Readiness check
    this.app.get('/health/ready', (req, res) => {
      // Check if service is ready to handle requests
      const ready = true; // Could check database connections, etc.
      if (ready) {
        res.json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    });

    // Liveness check
    this.app.get('/health/live', (req, res) => {
      res.json({ status: 'alive' });
    });

    // Metrics (basic)
    this.app.get('/metrics', (req, res) => {
      res.json({
        registeredRunbooks: this.engine.getRunbooks().length,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get the engine instance (for registering custom executors/runbooks)
   */
  getEngine(): RunbookEngine {
    return this.engine;
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(
            `Runbook Orchestration Service listening on port ${this.config.port}`
          );
          console.log(`API: http://localhost:${this.config.port}/api/v1`);
          console.log(`Health: http://localhost:${this.config.port}/health/ready`);
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the service gracefully
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }

      console.log('Shutting down Runbook Orchestration Service...');

      this.server.close((err: Error) => {
        if (err) {
          console.error('Error during shutdown:', err);
          return reject(err);
        }
        console.log('Service shut down successfully');
        resolve();
      });
    });
  }
}

/**
 * Create and start service from environment variables
 */
export async function createServiceFromEnv(): Promise<RunbookService> {
  const config: ServiceConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    engine: {
      maxConcurrentSteps: parseInt(
        process.env.MAX_CONCURRENT_STEPS || '5',
        10
      ),
      defaultRetryPolicy: {
        maxAttempts: parseInt(process.env.DEFAULT_MAX_RETRIES || '3', 10),
        initialDelayMs: parseInt(
          process.env.DEFAULT_INITIAL_DELAY_MS || '1000',
          10
        ),
        maxDelayMs: parseInt(process.env.DEFAULT_MAX_DELAY_MS || '10000', 10),
        backoffMultiplier: parseFloat(
          process.env.DEFAULT_BACKOFF_MULTIPLIER || '2'
        ),
      },
      storageBackend:
        (process.env.STORAGE_BACKEND as 'memory' | 'postgres' | 'redis') ||
        'memory',
      storageConfig: process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : undefined,
      detailedLogging: process.env.DETAILED_LOGGING === 'true',
    },
    enableCors: process.env.ENABLE_CORS !== 'false',
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['*'],
  };

  const service = new RunbookService(config);
  await service.start();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await service.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return service;
}

/**
 * Main entry point (if run directly)
 */
if (require.main === module) {
  createServiceFromEnv().catch((error) => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}
