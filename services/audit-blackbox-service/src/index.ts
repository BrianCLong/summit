/**
 * Audit Black Box Service
 *
 * Immutable audit flight recorder with tamper-evident storage for IntelGraph.
 * Provides:
 * - Cryptographic hash chain for tamper detection
 * - Merkle tree checkpoints for efficient verification
 * - Strict authorization for audit access
 * - RTBF compliance via tombstone-based redaction
 * - Comprehensive APIs for search, export, and verification
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { ImmutableAuditStore } from './store/immutable-store.js';
import { AuditEventBuffer } from './core/event-buffer.js';
import { RedactionService } from './redaction/redaction-service.js';
import { IntegrityVerifier } from './verification/integrity-verifier.js';
import { createAuditRouter } from './api/audit-api.js';
import type { BlackBoxServiceConfig } from './core/types.js';
import { DEFAULT_CONFIG } from './core/types.js';

// Re-export types and components
export * from './core/types.js';
export { ImmutableAuditStore } from './store/immutable-store.js';
export { AuditEventBuffer } from './core/event-buffer.js';
export { RedactionService } from './redaction/redaction-service.js';
export { IntegrityVerifier } from './verification/integrity-verifier.js';

/**
 * Audit Black Box Service
 */
export class AuditBlackBoxService {
  private app: express.Application;
  private pool: Pool;
  private store: ImmutableAuditStore;
  private buffer: AuditEventBuffer;
  private redactionService: RedactionService;
  private verifier: IntegrityVerifier;
  private config: BlackBoxServiceConfig;
  private logger: pino.Logger;
  private server?: ReturnType<typeof express.application.listen>;

  constructor(config: Partial<BlackBoxServiceConfig>) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as BlackBoxServiceConfig;

    // Initialize logger
    this.logger = pino({
      level: this.config.logLevel,
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
    });

    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: this.config.postgres.host,
      port: this.config.postgres.port,
      database: this.config.postgres.database,
      user: this.config.postgres.user,
      password: this.config.postgres.password,
      ssl: this.config.postgres.ssl,
      max: this.config.postgres.poolSize || 20,
    });

    // Initialize store
    this.store = new ImmutableAuditStore(this.pool, this.config);

    // Initialize buffer with flush to store
    this.buffer = new AuditEventBuffer({
      maxSize: this.config.maxBufferSize,
      flushIntervalMs: this.config.flushIntervalMs,
      batchSize: this.config.batchSize,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        await this.store.appendEventsBatch(events);
      },
      onDrop: (event, reason) => {
        this.logger.warn({ eventId: event.id, reason }, 'Audit event dropped');
      },
      onBackpressure: (active) => {
        this.logger.warn({ active }, 'Backpressure status changed');
      },
    });

    // Initialize redaction service
    this.redactionService = new RedactionService(
      this.pool,
      this.store,
      this.config,
    );

    // Initialize verifier
    this.verifier = new IntegrityVerifier(this.pool, this.config);

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupEventHandlers();
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    this.logger.info('Starting Audit Black Box Service...');

    // Initialize store schema
    await this.store.initialize();
    this.logger.info('Immutable store initialized');

    // Initialize redaction service schema
    await this.redactionService.initialize();
    this.logger.info('Redaction service initialized');

    // Start HTTP server
    return new Promise((resolve) => {
      this.server = this.app.listen(
        this.config.apiPort,
        this.config.apiHost,
        () => {
          this.logger.info(
            { port: this.config.apiPort, host: this.config.apiHost },
            'Audit Black Box Service started',
          );
          resolve();
        },
      );
    });
  }

  /**
   * Stop the service gracefully
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Audit Black Box Service...');

    // Shutdown buffer (flush remaining events)
    await this.buffer.shutdown();
    this.logger.info('Buffer flushed');

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err: Error | undefined) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.logger.info('HTTP server stopped');
    }

    // Close database pool
    await this.pool.end();
    this.logger.info('Database pool closed');

    this.logger.info('Audit Black Box Service stopped');
  }

  /**
   * Get the Express app (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the store (for testing)
   */
  getStore(): ImmutableAuditStore {
    return this.store;
  }

  /**
   * Get the buffer (for testing)
   */
  getBuffer(): AuditEventBuffer {
    return this.buffer;
  }

  /**
   * Get the redaction service (for testing)
   */
  getRedactionService(): RedactionService {
    return this.redactionService;
  }

  /**
   * Get the verifier (for testing)
   */
  getVerifier(): IntegrityVerifier {
    return this.verifier;
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-User-Id',
          'X-Tenant-Id',
          'X-User-Roles',
          'X-User-Permissions',
          'X-Correlation-Id',
        ],
      }),
    );

    // Request logging
    this.app.use(
      pinoHttp({
        logger: this.logger,
        autoLogging: {
          ignore: (req) => req.url === '/audit/health',
        },
      }),
    );

    // Trust proxy
    this.app.set('trust proxy', 1);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Mount audit API
    const auditRouter = createAuditRouter(
      this.store,
      this.pool,
      this.config,
    );
    this.app.use('/audit', auditRouter);

    // Root health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'audit-blackbox-service' });
    });

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use(
      (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        this.logger.error({ err }, 'Unhandled error');
        res.status(500).json({ error: 'Internal server error' });
      },
    );
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Store events
    this.store.on('initialized', (data) => {
      this.logger.info(data, 'Store initialized');
    });

    this.store.on('eventAppended', (data) => {
      this.logger.debug(data, 'Event appended');
    });

    this.store.on('checkpointCreated', (checkpoint) => {
      this.logger.info(
        { checkpointId: checkpoint.id, sequence: checkpoint.endSequence.toString() },
        'Merkle checkpoint created',
      );
    });

    this.store.on('error', (data) => {
      this.logger.error(data, 'Store error');
    });

    // Buffer events
    this.buffer.on('backpressure', (active) => {
      this.logger.warn({ active }, 'Buffer backpressure');
    });

    this.buffer.on('flushed', (data) => {
      this.logger.debug(data, 'Buffer flushed');
    });

    this.buffer.on('dropped', (data) => {
      this.logger.warn(data, 'Event dropped');
    });

    this.buffer.on('error', (err) => {
      this.logger.error({ err }, 'Buffer error');
    });

    // Redaction events
    this.redactionService.on('requestSubmitted', (request) => {
      this.logger.info(
        { requestId: request.id, subjectUserId: request.subjectUserId },
        'Redaction request submitted',
      );
    });

    this.redactionService.on('redactionExecuted', (data) => {
      this.logger.warn(data, 'Redaction executed');
    });

    // Verifier events
    this.verifier.on('progress', (data) => {
      this.logger.debug(data, 'Verification progress');
    });

    this.verifier.on('complete', (report) => {
      this.logger.info(
        {
          valid: report.valid,
          totalEvents: report.summary.totalEvents,
          issues: report.issues.length,
        },
        'Verification complete',
      );
    });
  }
}

/**
 * Create and start the service
 */
export async function createService(
  config: Partial<BlackBoxServiceConfig>,
): Promise<AuditBlackBoxService> {
  const service = new AuditBlackBoxService(config);
  await service.start();
  return service;
}

// Start service if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: Partial<BlackBoxServiceConfig> = {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DATABASE || 'audit_blackbox',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    },
    signingKey: process.env.AUDIT_SIGNING_KEY || 'dev-signing-key-change-in-production',
    apiPort: parseInt(process.env.API_PORT || '4001', 10),
    apiHost: process.env.API_HOST || '0.0.0.0',
    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };

  createService(config).catch((err) => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });
}
