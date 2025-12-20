// @ts-nocheck
/**
 * Ingest Adapters Service
 *
 * Main entry point for the ingest adapters service.
 * Manages multiple adapters with unified backpressure, checkpointing,
 * and observability.
 */

import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { trace, metrics, context } from '@opentelemetry/api';
import Redis from 'ioredis';
import { Kafka, Producer } from 'kafkajs';

import type {
  IngestServiceConfig,
  AdapterConfig,
  IngestEnvelope,
  Checkpoint,
  BackpressureMetrics,
  DLQRecord,
} from './types/index.js';
import { createAdapter, WebhookAdapter, CheckpointStore, DLQStore } from './adapters/index.js';
import { BackpressureController } from './lib/backpressure.js';

// ============================================================================
// Service Implementation
// ============================================================================

export class IngestService {
  private config: IngestServiceConfig;
  private logger: pino.Logger;
  private app: express.Application;
  private redis: Redis | null = null;
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private adapters: Map<string, ReturnType<typeof createAdapter>> = new Map();
  private globalBackpressure: BackpressureController;
  private running = false;

  constructor(config: IngestServiceConfig) {
    this.config = config;
    this.logger = pino({
      name: config.service_name,
      level: process.env.LOG_LEVEL ?? 'info',
    });

    this.app = express();
    this.globalBackpressure = new BackpressureController(config.backpressure);

    this.setupExpress();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    this.logger.info('Starting ingest service...');

    // Connect to Redis
    this.redis = new Redis(this.config.redis_url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    await new Promise<void>((resolve, reject) => {
      this.redis!.once('ready', resolve);
      this.redis!.once('error', reject);
    });

    this.logger.info('Connected to Redis');

    // Connect to Kafka producer
    this.kafka = new Kafka({
      clientId: this.config.service_name,
      brokers: this.config.kafka_brokers,
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.info('Connected to Kafka');

    // Create checkpoint and DLQ stores
    const checkpointStore = this.createCheckpointStore();
    const dlqStore = this.createDLQStore();

    // Initialize adapters
    for (const adapterConfig of this.config.adapters) {
      if (!adapterConfig.enabled) {
        this.logger.info({ name: adapterConfig.name }, 'Adapter disabled, skipping');
        continue;
      }

      try {
        const adapter = createAdapter({
          config: adapterConfig,
          logger: this.logger.child({ adapter: adapterConfig.name }),
          checkpointStore,
          dlqStore,
          events: {
            onRecord: (envelope) => this.handleRecord(envelope),
            onBackpressure: (metrics) => this.handleBackpressure(adapterConfig.name, metrics),
          },
        });

        await adapter.initialize();
        this.adapters.set(adapterConfig.name, adapter);

        // Register webhook routes
        if (adapterConfig.source_type === 'webhook') {
          this.registerWebhookRoute(adapter as WebhookAdapter);
        }

        this.logger.info({ name: adapterConfig.name, type: adapterConfig.source_type }, 'Adapter initialized');
      } catch (error) {
        this.logger.error({ name: adapterConfig.name, error }, 'Failed to initialize adapter');
      }
    }

    // Start all adapters
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.start();
        this.logger.info({ name }, 'Adapter started');
      } catch (error) {
        this.logger.error({ name, error }, 'Failed to start adapter');
      }
    }

    // Start HTTP server
    const port = this.config.port;
    await new Promise<void>((resolve) => {
      this.app.listen(port, () => {
        this.logger.info({ port }, 'HTTP server listening');
        resolve();
      });
    });

    this.running = true;
    this.logger.info('Ingest service started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping ingest service...');
    this.running = false;

    // Stop all adapters
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.stop();
        this.logger.info({ name }, 'Adapter stopped');
      } catch (error) {
        this.logger.error({ name, error }, 'Error stopping adapter');
      }
    }

    // Disconnect from Kafka
    if (this.producer) {
      await this.producer.disconnect();
    }

    // Disconnect from Redis
    if (this.redis) {
      await this.redis.quit();
    }

    this.logger.info('Ingest service stopped');
  }

  // -------------------------------------------------------------------------
  // Express Setup
  // -------------------------------------------------------------------------

  private setupExpress(): void {
    this.app.use(helmet());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(pinoHttp({ logger: this.logger }));

    // Health endpoints
    if (this.config.health_enabled) {
      this.app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      this.app.get('/health/ready', async (req, res) => {
        const ready = this.running && this.adapters.size > 0;
        res.status(ready ? 200 : 503).json({
          ready,
          adapters: this.adapters.size,
        });
      });

      this.app.get('/health/live', (req, res) => {
        res.json({ live: true });
      });

      this.app.get('/health/detailed', async (req, res) => {
        const adapterHealth: Record<string, unknown> = {};

        for (const [name, adapter] of this.adapters) {
          try {
            adapterHealth[name] = await adapter.healthCheck();
          } catch (error) {
            adapterHealth[name] = { healthy: false, error: String(error) };
          }
        }

        res.json({
          service: this.config.service_name,
          running: this.running,
          adapters: adapterHealth,
          backpressure: this.globalBackpressure.getMetrics(),
        });
      });
    }

    // Metrics endpoint
    if (this.config.metrics_enabled) {
      this.app.get('/metrics', async (req, res) => {
        // TODO: Implement Prometheus metrics export
        res.set('Content-Type', 'text/plain');
        res.send('# Metrics endpoint - TODO\n');
      });
    }

    // Backpressure control endpoints
    this.app.post('/admin/drain', async (req, res) => {
      for (const adapter of this.adapters.values()) {
        await adapter.drain();
      }
      res.json({ status: 'drain enabled' });
    });

    this.app.post('/admin/resume', async (req, res) => {
      this.globalBackpressure.disableDrain();
      res.json({ status: 'resumed' });
    });

    this.app.post('/admin/brownout', async (req, res) => {
      const sampleRate = parseFloat(req.query.rate as string) || 0.1;
      this.globalBackpressure.enableBrownout(sampleRate);
      res.json({ status: 'brownout enabled', sampleRate });
    });
  }

  private registerWebhookRoute(adapter: WebhookAdapter): void {
    const path = adapter.getPath();
    const method = adapter.getMethod().toLowerCase();

    this.logger.info({ path, method }, 'Registering webhook route');

    (this.app as any)[method](path, async (req: express.Request, res: express.Response) => {
      const response = await adapter.handleRequest({
        headers: req.headers as Record<string, string | string[] | undefined>,
        body: req.body,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          res.set(key, value);
        }
      }

      res.status(response.status).json(response.body);
    });
  }

  // -------------------------------------------------------------------------
  // Record Handling
  // -------------------------------------------------------------------------

  private async handleRecord(envelope: IngestEnvelope): Promise<void> {
    // Check global backpressure
    const { acquired, waitMs } = await this.globalBackpressure.acquire(
      envelope.metadata?.priority ?? 50
    );

    if (!acquired) {
      if (waitMs && waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        // Dropped
        return;
      }
    }

    try {
      // Send to output Kafka topic
      await this.producer!.send({
        topic: this.config.output_topic,
        messages: [
          {
            key: `${envelope.tenant_id}:${envelope.entity.type}:${envelope.entity.id}`,
            value: JSON.stringify(envelope),
            headers: {
              tenant_id: envelope.tenant_id,
              entity_type: envelope.entity.type,
              trace_id: envelope.trace_id ?? '',
            },
          },
        ],
      });
    } finally {
      this.globalBackpressure.release();
    }
  }

  private handleBackpressure(adapterName: string, metrics: BackpressureMetrics): void {
    this.logger.info({ adapter: adapterName, metrics }, 'Adapter backpressure update');

    // Propagate severe backpressure to global controller
    if (metrics.state === 'brownout' || metrics.state === 'drain') {
      this.globalBackpressure.signalBackpressure('severe');
    } else if (metrics.state === 'throttled') {
      this.globalBackpressure.signalBackpressure('moderate');
    } else if (metrics.state === 'normal') {
      this.globalBackpressure.releaseBackpressure();
    }
  }

  // -------------------------------------------------------------------------
  // Stores
  // -------------------------------------------------------------------------

  private createCheckpointStore(): CheckpointStore {
    return {
      get: async (tenantId: string, source: string): Promise<Checkpoint | null> => {
        const key = `checkpoint:${tenantId}:${source}`;
        const data = await this.redis!.get(key);
        return data ? JSON.parse(data) : null;
      },

      set: async (checkpoint: Checkpoint): Promise<void> => {
        const key = `checkpoint:${checkpoint.tenant_id}:${checkpoint.source}`;
        await this.redis!.set(key, JSON.stringify(checkpoint));
      },

      delete: async (tenantId: string, source: string): Promise<void> => {
        const key = `checkpoint:${tenantId}:${source}`;
        await this.redis!.del(key);
      },
    };
  }

  private createDLQStore(): DLQStore {
    return {
      add: async (record: DLQRecord): Promise<void> => {
        const key = `dlq:${record.envelope.tenant_id}:${record.id}`;
        const listKey = `dlq:list:${record.envelope.tenant_id}`;

        await Promise.all([
          this.redis!.set(key, JSON.stringify(record), 'EX', 86400 * 7), // 7 day TTL
          this.redis!.lpush(listKey, record.id),
          this.redis!.ltrim(listKey, 0, 9999), // Keep last 10k entries
        ]);

        // Also send to DLQ topic
        await this.producer!.send({
          topic: this.config.dlq_topic,
          messages: [
            {
              key: record.id,
              value: JSON.stringify(record),
              headers: {
                tenant_id: record.envelope.tenant_id,
                reason_code: record.reason_code,
              },
            },
          ],
        });
      },

      get: async (id: string): Promise<DLQRecord | null> => {
        // Need tenant_id to construct key - search all keys
        const keys = await this.redis!.keys(`dlq:*:${id}`);
        if (keys.length === 0) return null;

        const data = await this.redis!.get(keys[0]);
        return data ? JSON.parse(data) : null;
      },

      list: async (tenantId: string, options?: { limit?: number; offset?: number }): Promise<DLQRecord[]> => {
        const listKey = `dlq:list:${tenantId}`;
        const start = options?.offset ?? 0;
        const stop = start + (options?.limit ?? 100) - 1;

        const ids = await this.redis!.lrange(listKey, start, stop);
        const records: DLQRecord[] = [];

        for (const id of ids) {
          const key = `dlq:${tenantId}:${id}`;
          const data = await this.redis!.get(key);
          if (data) {
            records.push(JSON.parse(data));
          }
        }

        return records;
      },

      redrive: async (id: string): Promise<IngestEnvelope | null> => {
        const record = await this.get(id);
        if (!record || !record.can_redrive) {
          return null;
        }

        // Re-queue the envelope
        await this.handleRecord(record.envelope);

        // Remove from DLQ
        await this.delete(id);

        return record.envelope;
      },

      delete: async (id: string): Promise<void> => {
        const keys = await this.redis!.keys(`dlq:*:${id}`);
        if (keys.length > 0) {
          await this.redis!.del(...keys);
        }
      },
    } as DLQStore;
  }
}

// ============================================================================
// Exports
// ============================================================================

export * from './types/index.js';
export * from './adapters/index.js';
export * from './lib/backpressure.js';
export * from './lib/retry.js';
export * from './lib/dedupe.js';

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const config: IngestServiceConfig = {
    service_name: process.env.SERVICE_NAME ?? 'ingest-adapters',
    port: parseInt(process.env.PORT ?? '8080', 10),
    health_enabled: true,
    metrics_enabled: true,
    redis_url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    kafka_brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    output_topic: process.env.OUTPUT_TOPIC ?? 'ingest.records',
    dlq_topic: process.env.DLQ_TOPIC ?? 'ingest.dlq',
    adapters: JSON.parse(process.env.ADAPTERS_CONFIG ?? '[]'),
    backpressure: {
      max_concurrency: parseInt(process.env.MAX_CONCURRENCY ?? '100', 10),
      rate_limit_rps: parseInt(process.env.RATE_LIMIT_RPS ?? '1000', 10),
      high_water_mark: parseInt(process.env.HIGH_WATER_MARK ?? '10000', 10),
      low_water_mark: parseInt(process.env.LOW_WATER_MARK ?? '1000', 10),
    },
    retry: {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 30000,
      backoff_multiplier: 2.0,
      jitter_factor: 0.1,
    },
  };

  const service = new IngestService(config);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await service.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await service.stop();
    process.exit(0);
  });

  await service.start();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
