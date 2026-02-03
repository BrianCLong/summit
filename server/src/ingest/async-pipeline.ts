import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
import { IngestService, IngestInput } from '../services/IngestService.js';
import { ResidencyGuard } from '../data-residency/residency-guard.js';
import { getCurrentRegion } from '../config/regional-config.js';
import logger from '../utils/logger.js';

export type AsyncIngestStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface AsyncIngestJob {
  id: string;
  tenantId: string;
  payload: IngestInput;
  payloadHash: string;
  idempotencyKey?: string | null;
  status: AsyncIngestStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AsyncOutboxEvent {
  id: number;
  jobId: string;
  attempts: number;
  nextAttemptAt: Date;
  processedAt?: Date | null;
  lastError?: string | null;
  job: AsyncIngestJob;
}

export interface AsyncIngestRepository {
  insertJobWithOutbox(
    payload: IngestInput,
    payloadHash: string,
    idempotencyKey?: string,
  ): Promise<{ job: AsyncIngestJob; duplicate: boolean }>;
  claimPending(batchSize: number, now: Date): Promise<AsyncOutboxEvent[]>;
  markJobProcessing(jobId: string): Promise<void>;
  markJobCompleted(jobId: string): Promise<void>;
  markJobFailed(jobId: string, error: string): Promise<void>;
  markOutboxProcessed(outboxId: number): Promise<void>;
  rescheduleOutbox(
    outboxId: number,
    nextAttemptAt: Date,
    error?: string,
  ): Promise<void>;
  countProcessingForTenant(tenantId: string): Promise<number>;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
  );
  return `{${entries.join(',')}}`;
}

export function calculatePayloadHash(payload: IngestInput): string {
  return createHash('sha256')
    .update(stableStringify(payload))
    .digest('hex');
}

export function calculateBackoffDelay(
  attempts: number,
  baseMs = 500,
  maxMs = 30_000,
): number {
  const delay = baseMs * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(delay, maxMs);
}

class CircuitBreaker {
  private failures: Map<string, number> = new Map();
  private openUntil: Map<string, number> = new Map();

  constructor(
    private threshold = 3,
    private cooldownMs = 10_000,
  ) { }

  canPass(key: string, now: number): boolean {
    const openUntil = this.openUntil.get(key) || 0;
    return openUntil <= now;
  }

  recordSuccess(key: string) {
    this.failures.delete(key);
    this.openUntil.delete(key);
  }

  recordFailure(key: string, now: number) {
    const current = this.failures.get(key) || 0;
    const next = current + 1;
    this.failures.set(key, next);

    if (next >= this.threshold) {
      this.openUntil.set(key, now + this.cooldownMs);
    }
  }
}

export class PgAsyncIngestRepository implements AsyncIngestRepository {
  constructor(private pool: Pool, private workerId = 'pg-worker') { }

  async insertJobWithOutbox(
    payload: IngestInput,
    payloadHash: string,
    idempotencyKey?: string,
  ): Promise<{ job: AsyncIngestJob; duplicate: boolean }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT *
         FROM ingest_async_jobs
         WHERE tenant_id = $1
           AND (payload_hash = $2 OR (idempotency_key IS NOT NULL AND idempotency_key = $3))
         LIMIT 1
         FOR UPDATE`,
        [payload.tenantId, payloadHash, idempotencyKey || null],
      );

      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return { job: this.mapRow(existing.rows[0]), duplicate: true };
      }

      const jobId = randomUUID();
      const jobResult = await client.query(
        `INSERT INTO ingest_async_jobs (
           id, tenant_id, payload, payload_hash, idempotency_key,
           status, attempts, next_attempt_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, NOW(), NOW(), NOW())
         RETURNING *`,
        [jobId, payload.tenantId, payload, payloadHash, idempotencyKey || null],
      );

      await client.query(
        `INSERT INTO ingest_async_outbox (job_id, event_type, payload, next_attempt_at, locked_by)
         VALUES ($1, 'ingest.requested', $2, NOW(), $3)`,
        [jobId, payload, this.workerId],
      );

      await client.query('COMMIT');
      return { job: this.mapRow(jobResult.rows[0]), duplicate: false };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claimPending(batchSize: number, now: Date): Promise<AsyncOutboxEvent[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT 
           o.id as outbox_id,
           o.attempts as outbox_attempts,
           o.next_attempt_at,
           o.processed_at,
           o.last_error as outbox_error,
           j.*
         FROM ingest_async_outbox o
         JOIN ingest_async_jobs j ON j.id = o.job_id
         WHERE o.processed_at IS NULL
           AND o.next_attempt_at <= $1
         ORDER BY o.created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [now, batchSize],
      );

      const events: AsyncOutboxEvent[] = [];
      for (const row of rows) {
        await client.query(
          `UPDATE ingest_async_outbox
             SET attempts = $2, locked_at = NOW(), locked_by = $3
           WHERE id = $1`,
          [row.outbox_id, Number(row.outbox_attempts || 0) + 1, this.workerId],
        );

        events.push({
          id: row.outbox_id,
          jobId: row.id,
          attempts: Number(row.outbox_attempts || 0) + 1,
          nextAttemptAt: row.next_attempt_at,
          processedAt: row.processed_at,
          lastError: row.outbox_error,
          job: this.mapRow(row),
        });
      }

      await client.query('COMMIT');
      return events;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markJobProcessing(jobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ingest_async_jobs
         SET status = 'PROCESSING',
             attempts = attempts + 1,
             updated_at = NOW(),
             locked_at = NOW(),
             next_attempt_at = NOW()
       WHERE id = $1`,
      [jobId],
    );
  }

  async markJobCompleted(jobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ingest_async_jobs
         SET status = 'COMPLETED',
             updated_at = NOW(),
             last_error = NULL
       WHERE id = $1`,
      [jobId],
    );
  }

  async markJobFailed(jobId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE ingest_async_jobs
         SET status = 'FAILED',
             updated_at = NOW(),
             last_error = $2
       WHERE id = $1`,
      [jobId, error],
    );
  }

  async markOutboxProcessed(outboxId: number): Promise<void> {
    await this.pool.query(
      `UPDATE ingest_async_outbox
         SET processed_at = NOW(),
             last_error = NULL,
             locked_at = NULL,
             locked_by = NULL
       WHERE id = $1`,
      [outboxId],
    );
  }

  async rescheduleOutbox(
    outboxId: number,
    nextAttemptAt: Date,
    error?: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE ingest_async_outbox
         SET next_attempt_at = $2,
             last_error = $3,
             locked_at = NULL,
             locked_by = NULL
       WHERE id = $1`,
      [outboxId, nextAttemptAt, error || null],
    );
  }

  async countProcessingForTenant(tenantId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS count
         FROM ingest_async_jobs
        WHERE tenant_id = $1
          AND status = 'PROCESSING'`,
      [tenantId],
    );

    return Number(rows[0]?.count || 0);
  }

  private mapRow(row: Record<string, unknown>): AsyncIngestJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      payload: row.payload as IngestInput,
      payloadHash: row.payload_hash as string,
      idempotencyKey: row.idempotency_key as string | null,
      status: row.status as AsyncIngestStatus,
      attempts: Number(row.attempts || 0),
      nextAttemptAt: row.next_attempt_at as Date,
      lastError: row.last_error as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}

export class InMemoryAsyncIngestRepository implements AsyncIngestRepository {
  public jobs: Map<string, AsyncIngestJob> = new Map();
  public outbox: Map<number, AsyncOutboxEvent> = new Map();
  private seq = 1;

  async insertJobWithOutbox(
    payload: IngestInput,
    payloadHash: string,
    idempotencyKey?: string,
  ): Promise<{ job: AsyncIngestJob; duplicate: boolean }> {
    const duplicateJob = Array.from(this.jobs.values()).find(
      (job: any) =>
        job.tenantId === payload.tenantId &&
        (job.payloadHash === payloadHash ||
          (!!idempotencyKey && job.idempotencyKey === idempotencyKey)),
    );

    if (duplicateJob) {
      return { job: duplicateJob, duplicate: true };
    }

    const job: AsyncIngestJob = {
      id: randomUUID(),
      tenantId: payload.tenantId,
      payload,
      payloadHash,
      idempotencyKey: idempotencyKey || null,
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastError: null,
    };

    this.jobs.set(job.id, job);

    const outbox: AsyncOutboxEvent = {
      id: this.seq++,
      jobId: job.id,
      attempts: 0,
      nextAttemptAt: new Date(),
      processedAt: null,
      job,
    };

    this.outbox.set(outbox.id, outbox);
    return { job, duplicate: false };
  }

  async claimPending(
    batchSize: number,
    now: Date,
  ): Promise<AsyncOutboxEvent[]> {
    const events = Array.from(this.outbox.values())
      .filter(
        (evt) =>
          !evt.processedAt &&
          evt.nextAttemptAt.getTime() <= now.getTime() &&
          this.jobs.get(evt.jobId),
      )
      .sort((a, b) => a.id - b.id)
      .slice(0, batchSize);

    const claimed: AsyncOutboxEvent[] = [];
    for (const event of events) {
      const nextAttempts = event.attempts + 1;
      const updated: AsyncOutboxEvent = {
        ...event,
        attempts: nextAttempts,
        job: this.jobs.get(event.jobId)!,
      };
      this.outbox.set(event.id, updated);
      claimed.push(updated);
    }

    return claimed;
  }

  async markJobProcessing(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status: 'PROCESSING',
      attempts: job.attempts + 1,
      updatedAt: new Date(),
    });
  }

  async markJobCompleted(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status: 'COMPLETED',
      updatedAt: new Date(),
      lastError: null,
    });
  }

  async markJobFailed(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status: 'FAILED',
      updatedAt: new Date(),
      lastError: error,
    });
  }

  async markOutboxProcessed(outboxId: number): Promise<void> {
    const evt = this.outbox.get(outboxId);
    if (!evt) return;
    this.outbox.set(outboxId, { ...evt, processedAt: new Date() });
  }

  async rescheduleOutbox(
    outboxId: number,
    nextAttemptAt: Date,
    error?: string,
  ): Promise<void> {
    const evt = this.outbox.get(outboxId);
    if (!evt) return;
    this.outbox.set(outboxId, {
      ...evt,
      nextAttemptAt,
      lastError: error,
    });
  }

  async countProcessingForTenant(tenantId: string): Promise<number> {
    return Array.from(this.jobs.values()).filter(
      (job: any) => job.tenantId === tenantId && job.status === 'PROCESSING',
    ).length;
  }
}

export class AsyncIngestDispatcher {
  constructor(private repo: AsyncIngestRepository) { }

  async enqueue(
    payload: IngestInput,
    idempotencyKey?: string,
  ): Promise<{
    jobId: string;
    duplicate: boolean;
    status: AsyncIngestStatus;
    payloadHash: string;
  }> {
    const payloadHash = calculatePayloadHash(payload);
    const { job, duplicate } = await this.repo.insertJobWithOutbox(
      payload,
      payloadHash,
      idempotencyKey,
    );

    return {
      jobId: job.id,
      duplicate,
      status: job.status,
      payloadHash,
    };
  }
}

export class AsyncIngestWorker {
  private timer?: NodeJS.Timeout;
  private breaker = new CircuitBreaker();
  private inFlight: Map<string, number> = new Map();

  constructor(
    private repo: AsyncIngestRepository,
    private ingestService: IngestService,
    private options: {
      batchSize?: number;
      baseBackoffMs?: number;
      maxBackoffMs?: number;
      maxTenantConcurrency?: number;
      pollIntervalMs?: number;
    } = {},
  ) {
    this.options = {
      batchSize: 25,
      baseBackoffMs: 500,
      maxBackoffMs: 30_000,
      maxTenantConcurrency:
        Number(process.env.ASYNC_INGEST_TENANT_CONCURRENCY || '2') || 2,
      pollIntervalMs: 1000,
      ...options,
    };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processOnce().catch((err: any) => {
        logger.error({ err }, 'Async ingest worker tick failed');
      });
    }, this.options.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async processOnce(now: Date = new Date()): Promise<void> {
    const events = await this.repo.claimPending(
      this.options.batchSize!,
      now,
    );

    for (const event of events) {
      const tenantId = event.job.tenantId;

      if (event.job.status === 'COMPLETED') {
        await this.repo.markOutboxProcessed(event.id);
        continue;
      }

      const active =
        (this.inFlight.get(tenantId) || 0) +
        (await this.repo.countProcessingForTenant(tenantId));

      if (active >= this.options.maxTenantConcurrency!) {
        const delayMs = calculateBackoffDelay(
          event.attempts,
          this.options.baseBackoffMs,
          this.options.maxBackoffMs,
        );
        await this.repo.rescheduleOutbox(
          event.id,
          new Date(now.getTime() + delayMs),
          'Tenant concurrency cap reached',
        );
        continue;
      }

      if (!this.breaker.canPass('ingest', now.getTime())) {
        const delayMs = this.options.baseBackoffMs!;
        await this.repo.rescheduleOutbox(
          event.id,
          new Date(now.getTime() + delayMs),
          'Circuit breaker open',
        );
        continue;
      }

      this.inFlight.set(tenantId, (this.inFlight.get(tenantId) || 0) + 1);
      await this.repo.markJobProcessing(event.jobId);

      const guard = ResidencyGuard.getInstance();
      const isAllowed = await guard.isRegionAllowed(tenantId, getCurrentRegion(), 'storage');

      if (!isAllowed) {
        const delayMs = calculateBackoffDelay(event.attempts, this.options.baseBackoffMs, this.options.maxBackoffMs);
        await this.repo.markOutboxProcessed(event.id); // Or keep it in outbox for retry in correct region?
        // For now, fail it as it's a residency violation to process here.
        await this.repo.markJobFailed(event.jobId, `Residency violation: Current region ${getCurrentRegion()} is not allowed for tenant.`);
        this.inFlight.set(tenantId, Math.max(0, (this.inFlight.get(tenantId) || 1) - 1));
        continue;
      }

      try {
        await this.ingestService.ingest(event.job.payload);
        await this.repo.markJobCompleted(event.jobId);
        await this.repo.markOutboxProcessed(event.id);
        this.breaker.recordSuccess('ingest');
      } catch (error: any) {
        const delayMs = calculateBackoffDelay(
          event.attempts,
          this.options.baseBackoffMs,
          this.options.maxBackoffMs,
        );
        await this.repo.markJobFailed(
          event.jobId,
          error?.message || 'Unknown ingest failure',
        );
        await this.repo.rescheduleOutbox(
          event.id,
          new Date(now.getTime() + delayMs),
          error?.message,
        );
        this.breaker.recordFailure('ingest', now.getTime());
      } finally {
        this.inFlight.set(
          tenantId,
          Math.max(0, (this.inFlight.get(tenantId) || 1) - 1),
        );
      }
    }
  }
}
