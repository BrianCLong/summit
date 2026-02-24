import logger from '../utils/logger';
import { meteringPipeline } from './pipeline';
import { MeterEvent, MeterEventKind } from './schema';

export class MeteringEmitter {
  async emit(event: MeterEvent): Promise<void> {
    await meteringPipeline.enqueue(event);
  }

  async emitIngestUnits(input: {
    tenantId: string;
    units: number;
    source: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.INGEST_UNITS,
      tenantId: input.tenantId,
      units: input.units,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitQueryCredits(input: {
    tenantId: string;
    credits: number;
    source: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.QUERY_CREDITS,
      tenantId: input.tenantId,
      credits: input.credits,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitStorageEstimate(input: {
    tenantId: string;
    bytes: number;
    source: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.STORAGE_BYTES_ESTIMATE,
      tenantId: input.tenantId,
      bytes: input.bytes,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitActiveSeat(input: {
    tenantId: string;
    source: string;
    userId?: string;
    seatCount?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.USER_SEAT_ACTIVE,
      tenantId: input.tenantId,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
      seatCount: input.seatCount ?? 1,
      userId: input.userId,
    });
  }

  async emitLlmTokens(input: {
    tenantId: string;
    tokens: number;
    model: string;
    provider: string;
    source: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.LLM_TOKENS,
      tenantId: input.tenantId,
      tokens: input.tokens,
      model: input.model,
      provider: input.provider,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitComputeMs(input: {
    tenantId: string;
    durationMs: number;
    source: string;
    taskId?: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.MAESTRO_COMPUTE_MS,
      tenantId: input.tenantId,
      durationMs: input.durationMs,
      source: input.source,
      taskId: input.taskId,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitApiRequest(input: {
    tenantId: string;
    source: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.API_REQUEST,
      tenantId: input.tenantId,
      source: input.source,
      endpoint: input.endpoint,
      method: input.method,
      statusCode: input.statusCode,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  private async safeEmit(event: MeterEvent): Promise<void> {
    try {
      await this.emit(event);
    } catch (error: any) {
      logger.warn({ error, event }, 'Failed to emit meter event');
    }
  }
}

export const meteringEmitter = new MeteringEmitter();
