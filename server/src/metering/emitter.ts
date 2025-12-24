import logger from '../utils/logger.js';
import { meteringPipeline } from './pipeline.js';
import { MeterEvent, MeterEventKind } from './schema.js';

export class MeteringEmitter {
  async emit(event: MeterEvent): Promise<void> {
    await meteringPipeline.enqueue(event);
  }

  // Legacy Helpers
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

  // New Helpers

  async emitQueryExecuted(input: {
    tenantId: string;
    source: string;
    count?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.QUERY_EXECUTED,
      tenantId: input.tenantId,
      source: input.source,
      count: input.count ?? 1,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitIngestItem(input: {
    tenantId: string;
    source: string;
    count?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.INGEST_ITEM,
      tenantId: input.tenantId,
      source: input.source,
      count: input.count ?? 1,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitExportBuilt(input: {
    tenantId: string;
    source: string;
    count?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.EXPORT_BUILT,
      tenantId: input.tenantId,
      source: input.source,
      count: input.count ?? 1,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitArtifactStoredBytes(input: {
    tenantId: string;
    bytes: number;
    source: string;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.ARTIFACT_STORED_BYTES,
      tenantId: input.tenantId,
      bytes: input.bytes,
      source: input.source,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  async emitWebhookDelivered(input: {
    tenantId: string;
    source: string;
    count?: number;
    correlationId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.safeEmit({
      kind: MeterEventKind.WEBHOOK_DELIVERED,
      tenantId: input.tenantId,
      source: input.source,
      count: input.count ?? 1,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });
  }

  private async safeEmit(event: MeterEvent): Promise<void> {
    try {
      await this.emit(event);
    } catch (error) {
      logger.warn({ error, event }, 'Failed to emit meter event');
    }
  }
}

export const meteringEmitter = new MeteringEmitter();
