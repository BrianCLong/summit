import type Redis from 'ioredis';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import pino from 'pino';

export interface OfflineIngestionJobContext {
  job_id: string;
  data_source_id: string;
  source_type: string;
  target_graph: string;
}

export interface OfflineIngestionPayload {
  job: OfflineIngestionJobContext;
  runId?: string;
  entities: any[];
  relationships?: any[];
  metrics: {
    recordsProcessed: number;
    relationshipsCreated?: number;
  };
  metadata?: Record<string, any>;
  queuedAt: string;
  attempts?: number;
}

export interface RecordRunParams {
  jobId: string;
  status: string;
  processed: number;
  failed?: number;
  error?: string | null;
  runId?: string;
  metadata?: Record<string, any>;
  completed?: boolean;
}

const tracer = trace.getTracer('feed-processor');

export class OfflineQueuedError extends Error {
  public readonly payload: OfflineIngestionPayload;
  declare cause?: Error;

  constructor(message: string, payload: OfflineIngestionPayload, cause?: Error) {
    super(message);
    this.name = 'OfflineQueuedError';
    this.payload = payload;
    if (cause) {
      this.cause = cause;
    }
  }
}

export class IngestionMetadataRepository {
  constructor(private readonly pool: Pool, private readonly logger: pino.Logger) {}

  async recordRun(params: RecordRunParams): Promise<void> {
    return tracer.startActiveSpan('postgres.recordIngestionRun', async span => {
      span.setAttribute('ingestion.job_id', params.jobId);
      span.setAttribute('ingestion.status', params.status);
      const client = await this.pool.connect();

      try {
        const metadata = {
          ...(params.metadata || {}),
          runId: params.runId ?? null
        };

        await client.query(
          `INSERT INTO ingestion_job_runs (job_id, status, records_processed, records_failed, error_message, completed_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            params.jobId,
            params.status,
            params.processed,
            params.failed ?? 0,
            params.error ?? null,
            params.completed ? new Date().toISOString() : null,
            JSON.stringify(metadata)
          ]
        );
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        this.logger.error('Failed to record ingestion job run', {
          jobId: params.jobId,
          status: params.status,
          error: (error as Error).message
        });
        throw error;
      } finally {
        client.release();
        span.end();
      }
    });
  }
}

export interface OfflineQueueOptions {
  key?: string;
  deadLetterKey?: string;
  flushIntervalMs?: number;
  maxAttempts?: number;
  batchSize?: number;
}

type ApplyPayloadFn = (payload: OfflineIngestionPayload) => Promise<void>;

type ConnectivityCheckFn = () => Promise<boolean>;

export class OfflineQueueManager {
  private readonly key: string;
  private readonly deadLetterKey: string;
  private readonly flushIntervalMs: number;
  private readonly maxAttempts: number;
  private readonly batchSize: number;
  private flushTimer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    private readonly redis: Redis.Redis,
    private readonly applyPayload: ApplyPayloadFn,
    private readonly connectivityCheck: ConnectivityCheckFn,
    private readonly logger: pino.Logger,
    options: OfflineQueueOptions = {}
  ) {
    this.key = options.key || process.env.OFFLINE_QUEUE_KEY || 'offline:feed-processor:ingest';
    this.deadLetterKey = options.deadLetterKey || `${this.key}:dlq`;
    this.flushIntervalMs = options.flushIntervalMs || 15000;
    this.maxAttempts = options.maxAttempts || Number(process.env.OFFLINE_SYNC_MAX_ATTEMPTS || 5);
    this.batchSize = options.batchSize || 25;
  }

  start(): void {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        this.logger.error('Offline queue flush failed', {
          error: (error as Error).message
        });
      });
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  async enqueue(payload: OfflineIngestionPayload, error?: Error): Promise<void> {
    return tracer.startActiveSpan('offline.queue.enqueue', async span => {
      try {
        const serialised = JSON.stringify({ ...payload, attempts: payload.attempts ?? 0 });
        await this.redis.rpush(this.key, serialised);
        const length = await this.redis.llen(this.key);
        span.setAttribute('offline.queue.size', length);
        span.setAttribute('offline.job_id', payload.job.job_id);
        this.logger.warn('Queued ingestion payload for offline sync', {
          jobId: payload.job.job_id,
          runId: payload.runId,
          reason: error?.message
        });
      } catch (queueError) {
        span.recordException(queueError as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (queueError as Error).message });
        throw queueError;
      } finally {
        span.end();
      }
    });
  }

  async flush(): Promise<number> {
    return tracer.startActiveSpan('offline.queue.flush', async span => {
      if (this.flushing) {
        span.addEvent('flush.skipped.active');
        span.end();
        return 0;
      }

      const connected = await this.connectivityCheck();
      if (!connected) {
        span.addEvent('flush.skipped.offline');
        span.end();
        return 0;
      }

      this.flushing = true;
      let processed = 0;

      try {
        for (let i = 0; i < this.batchSize; i += 1) {
          const raw = await this.redis.lpop(this.key);
          if (!raw) {
            break;
          }

          const payload = JSON.parse(raw) as OfflineIngestionPayload;
          span.addEvent('flush.payload', { 'offline.job_id': payload.job.job_id });

          try {
            await this.applyPayload(payload);
            processed += 1;
          } catch (error) {
            const attempts = (payload.attempts ?? 0) + 1;
            payload.attempts = attempts;
            const serialised = JSON.stringify(payload);

            if (attempts >= this.maxAttempts || !OfflineQueueManager.isConnectivityError(error)) {
              await this.redis.rpush(this.deadLetterKey, serialised);
              this.logger.error('Offline payload moved to dead letter queue', {
                jobId: payload.job.job_id,
                attempts,
                error: (error as Error).message
              });
            } else {
              await this.redis.lpush(this.key, serialised);
              this.logger.warn('Requeued offline payload for later retry', {
                jobId: payload.job.job_id,
                attempts,
                error: (error as Error).message
              });
            }

            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            break;
          }
        }

        span.setAttribute('offline.flush_processed', processed);
        span.setStatus({ code: SpanStatusCode.OK });
        return processed;
      } finally {
        this.flushing = false;
        span.end();
      }
    });
  }

  async pendingCounts(): Promise<{ queue: number; deadLetter: number }> {
    const [queue, deadLetter] = await Promise.all([
      this.redis.llen(this.key),
      this.redis.llen(this.deadLetterKey)
    ]);
    return { queue, deadLetter };
  }

  async drainAll(): Promise<OfflineIngestionPayload[]> {
    const items: OfflineIngestionPayload[] = [];
    while (true) {
      const raw = await this.redis.lpop(this.key);
      if (!raw) {
        break;
      }
      items.push(JSON.parse(raw));
    }
    return items;
  }

  static isConnectivityError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const err = (error as { code?: string; message?: string; name?: string; cause?: unknown });

    const codes = new Set([
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENOTFOUND',
      '57P01', // PostgreSQL admin shutdown
      '57P02', // PostgreSQL crash shutdown
      '57P03' // PostgreSQL cannot connect now
    ]);

    if (err.code && codes.has(err.code)) {
      return true;
    }

    const message = (err.message || '').toLowerCase();
    if (
      message.includes('failed to connect') ||
      message.includes('connection refused') ||
      message.includes('connection reset') ||
      message.includes('service unavailable') ||
      message.includes('timed out')
    ) {
      return true;
    }

    if (err.name && err.name.toLowerCase().includes('serviceunavailable')) {
      return true;
    }

    if (err.cause) {
      return OfflineQueueManager.isConnectivityError(err.cause);
    }

    return false;
  }
}

export async function defaultConnectivityCheck(
  pgPool: Pool,
  neo4jDriver: Driver,
  logger: pino.Logger
): Promise<boolean> {
  return tracer.startActiveSpan('offline.queue.health', async span => {
    try {
      await Promise.all([
        pgPool.query('SELECT 1'),
        neo4jDriver.verifyConnectivity()
      ]);
      span.setStatus({ code: SpanStatusCode.OK });
      return true;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      logger.debug('Connectivity check failed', { error: (error as Error).message });
      return false;
    } finally {
      span.end();
    }
  });
}
