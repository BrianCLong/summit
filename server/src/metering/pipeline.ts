// @ts-nocheck
import logger from '../utils/logger.js';
import { postgresMeterRepository } from './postgres-repository.js';
import {
  MeterEvent,
  MeterEventKind,
  TenantUsageDailyRow,
} from './schema.js';

type DeadLetter = { event: MeterEvent; reason: string };

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const MAX_CACHE_SIZE = 10000;

export class MeteringPipeline {
  private processedKeys = new Set<string>();
  private deadLetters: DeadLetter[] = [];
  private rollups = new Map<string, TenantUsageDailyRow>();

  constructor() {
    // Periodically clean up cache to avoid memory leak
    setInterval(() => this.cleanupCache(), 1000 * 60 * 60); // Every hour
  }

  private cleanupCache() {
    if (this.processedKeys.size > MAX_CACHE_SIZE) {
        this.processedKeys.clear();
        logger.info('Cleared metering idempotency cache');
    }
  }

  async enqueue(event: MeterEvent): Promise<void> {
    try {
      await this.handleEvent(event);
    } catch (error) {
      this.deadLetters.push({
        event,
        reason: (error as Error).message,
      });
      logger.warn(
        { error, event },
        'MeteringPipeline moved event to DLQ',
      );
    }
  }

  async replayDLQ(
    transform?: (event: MeterEvent) => MeterEvent,
  ): Promise<{ replayed: number; remaining: number }> {
    const stillDead: DeadLetter[] = [];
    let replayed = 0;

    for (const dlq of this.deadLetters) {
      const event = transform ? transform(dlq.event) : dlq.event;
      try {
        await this.handleEvent(event);
        replayed++;
      } catch (error) {
        stillDead.push({
          event,
          reason: (error as Error).message,
        });
      }
    }

    this.deadLetters = stillDead;
    return { replayed, remaining: this.deadLetters.length };
  }

  getDeadLetters(): DeadLetter[] {
    return [...this.deadLetters];
  }

  getDailyRollups(): TenantUsageDailyRow[] {
    return Array.from(this.rollups.values());
  }

  reset(): void {
    this.processedKeys.clear();
    this.deadLetters = [];
    this.rollups.clear();
  }

  private async handleEvent(event: MeterEvent) {
    const idempotencyKey =
      event.idempotencyKey || event.correlationId || this.buildSyntheticKey(event);

    // In-memory dedup for speed
    if (this.processedKeys.has(idempotencyKey)) {
      return;
    }

    this.validate(event);

    // Persist to Postgres (Handles Idempotency)
    // If we have an idempotency key, we use it.
    // If not, we fall back to synthetic key in memory, but for DB we need to pass something if we want dedup.
    // The repository handles insertion into usage_events table.
    const eventWithKey = { ...event, idempotencyKey };

    try {
        const inserted = await postgresMeterRepository.recordEvent(eventWithKey);

        if (!inserted) {
            // Duplicate in DB
            this.processedKeys.add(idempotencyKey);
            return;
        }
    } catch (err) {
        logger.error({ err }, 'Failed to persist meter event');
        throw err;
    }

    this.processedKeys.add(idempotencyKey);

    const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
    const day = dateKey(occurred);
    const key = `${event.tenantId}:${day}`;

    const current =
      this.rollups.get(key) ||
      ({
        tenantId: event.tenantId,
        date: day,
        ingestUnits: 0,
        queryCredits: 0,
        storageBytesEstimate: 0,
        activeSeats: 0,
        correlationIds: [],
        lastEventAt: occurred.toISOString(),
      } satisfies TenantUsageDailyRow);

    switch (event.kind) {
      case MeterEventKind.INGEST_UNITS:
        current.ingestUnits += event.units;
        break;
      case MeterEventKind.QUERY_CREDITS:
        current.queryCredits += event.credits;
        break;
      case MeterEventKind.STORAGE_BYTES_ESTIMATE:
        current.storageBytesEstimate += event.bytes;
        break;
      case MeterEventKind.USER_SEAT_ACTIVE:
        current.activeSeats += event.seatCount ?? 1;
        break;
      default:
        const exhaustive: never = event.kind;
        throw new Error(`Unsupported meter event kind: ${(exhaustive as any)}`);
    }

    current.lastEventAt = occurred.toISOString();
    if (event.correlationId) {
      const seen = new Set(current.correlationIds);
      seen.add(event.correlationId);
      current.correlationIds = Array.from(seen);
    }

    this.rollups.set(key, current);
  }

  private validate(event: MeterEvent) {
    if (!event.tenantId) {
      throw new Error('tenantId is required');
    }

    if (event.kind === MeterEventKind.INGEST_UNITS && event.units < 0) {
      throw new Error('ingest units must be non-negative');
    }
    if (event.kind === MeterEventKind.QUERY_CREDITS && event.credits < 0) {
      throw new Error('query credits must be non-negative');
    }
    if (event.kind === MeterEventKind.STORAGE_BYTES_ESTIMATE && event.bytes < 0) {
      throw new Error('storage bytes must be non-negative');
    }
    if (event.kind === MeterEventKind.USER_SEAT_ACTIVE && (event.seatCount ?? 0) < 0) {
      throw new Error('seat count must be non-negative');
    }
  }

  private buildSyntheticKey(event: MeterEvent): string {
    const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
    return `${event.tenantId}:${event.kind}:${event.source}:${occurred.toISOString()}`;
  }
}

export const meteringPipeline = new MeteringPipeline();
