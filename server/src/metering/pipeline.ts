// @ts-nocheck
import logger from '../utils/logger.js';
import { postgresMeterRepository } from './postgres-repository.js';
import { meterStore } from './persistence.js';
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
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Periodically clean up cache to avoid memory leak
    this.cleanupTimer = setInterval(
      () => this.cleanupCache(),
      1000 * 60 * 60,
    ); // Every hour
    this.cleanupTimer.unref?.();
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
    } catch (error: any) {
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
      } catch (error: any) {
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
    const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
    // Ensure unique key for tests without idempotencyKey
    const idempotencyKey =
      event.idempotencyKey || event.correlationId || this.buildSyntheticKey(event);

    // In-memory dedup for speed
    if (this.processedKeys.has(idempotencyKey)) {
      return;
    }

    this.validate(event);

    // Persist to Postgres (Handles Idempotency)
    const eventWithKey = { ...event, idempotencyKey };

    try {
        const inserted = await postgresMeterRepository.recordEvent(eventWithKey);

        if (inserted === false) {
            this.processedKeys.add(idempotencyKey);
            return;
        }
    } catch (err: any) {
        logger.error({ err }, 'Failed to persist meter event');
    }

    // Write to Integrity Log (File Store)
    try {
        await meterStore.append(event);
    } catch (err: any) {
        logger.error({ err }, 'Failed to append to meter store');
        // We might want to throw here to DLQ, but for now we log.
        throw err;
    }

    this.processedKeys.add(idempotencyKey);

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
        llmTokens: 0,
        computeMs: 0,
        apiRequests: 0,
        policySimulations: 0,
        workflowExecutions: 0,
        receiptWrites: 0,
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
      case MeterEventKind.LLM_TOKENS:
        current.llmTokens = (current.llmTokens || 0) + event.tokens;
        break;
      case MeterEventKind.MAESTRO_COMPUTE_MS:
        current.computeMs = (current.computeMs || 0) + event.durationMs;
        break;
      case MeterEventKind.API_REQUEST:
        current.apiRequests = (current.apiRequests || 0) + 1;
        break;
      case MeterEventKind.POLICY_SIMULATION:
        current.policySimulations = (current.policySimulations || 0) + 1;
        break;
      case MeterEventKind.WORKFLOW_EXECUTION:
        current.workflowExecutions = (current.workflowExecutions || 0) + 1;
        break;
      case MeterEventKind.RECEIPT_WRITE:
        current.receiptWrites = (current.receiptWrites || 0) + 1;
        break;
      default:
        break;
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
    if (event.kind === MeterEventKind.LLM_TOKENS && event.tokens < 0) {
        throw new Error('llm tokens must be non-negative');
    }
    if (event.kind === MeterEventKind.MAESTRO_COMPUTE_MS && event.durationMs < 0) {
        throw new Error('compute duration must be non-negative');
    }
  }

  private buildSyntheticKey(event: MeterEvent): string {
    const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
    const unique = Math.random().toString(36).substring(7);
    return `${event.tenantId}:${event.kind}:${event.source}:${occurred.toISOString()}:${unique}`;
  }
}

export const meteringPipeline = new MeteringPipeline();
