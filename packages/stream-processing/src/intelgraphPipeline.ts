import { metrics } from "@opentelemetry/api";
import { randomUUID } from "crypto";
import { z } from "zod";

export type SinkRoute = "hot" | "warm" | "cold";

export interface Sink {
  name: string;
  write: (event: Record<string, any>) => Promise<void>;
}

export interface RateShaperConfig {
  capacityPerSecond: number;
  burstCapacity?: number;
}

export class TokenBucketRateShaper {
  private capacityPerSecond: number;
  private burstCapacity: number;
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateShaperConfig) {
    this.capacityPerSecond = config.capacityPerSecond;
    this.burstCapacity = config.burstCapacity ?? config.capacityPerSecond;
    this.tokens = this.burstCapacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    if (elapsedSeconds <= 0) return;

    const tokensToAdd = elapsedSeconds * this.capacityPerSecond;
    this.tokens = Math.min(this.tokens + tokensToAdd, this.burstCapacity);
    this.lastRefill = now;
  }

  async consume(tokens = 1): Promise<void> {
    if (tokens <= 0) return;

    while (true) {
      this.refill();
      if (this.tokens >= tokens) {
        this.tokens -= tokens;
        return;
      }

      const shortage = tokens - this.tokens;
      const waitMs = (shortage / this.capacityPerSecond) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitMs)));
    }
  }
}

export interface DedupeConfig {
  windowMs: number;
}

export class DedupeWindow {
  private readonly windowMs: number;
  private readonly seen = new Map<string, number>();

  constructor(config: DedupeConfig) {
    this.windowMs = config.windowMs;
  }

  isDuplicate(key: string, timestamp = Date.now()): boolean {
    this.evictExpired(timestamp);
    if (this.seen.has(key)) {
      return true;
    }

    this.seen.set(key, timestamp);
    return false;
  }

  private evictExpired(now: number): void {
    for (const [key, ts] of this.seen.entries()) {
      if (now - ts > this.windowMs) {
        this.seen.delete(key);
      }
    }
  }
}

export interface DeadLetterEvent {
  event: Record<string, any>;
  reason: string;
  attempts: number;
  nextAttemptAt: number;
}

export interface DeadLetterQueueConfig {
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterMs: number;
}

export class DeadLetterQueue {
  private readonly config: DeadLetterQueueConfig;
  private readonly items: DeadLetterEvent[] = [];

  constructor(config: DeadLetterQueueConfig) {
    this.config = config;
  }

  enqueue(event: Record<string, any>, reason: string): void {
    const now = Date.now();
    this.items.push({
      event,
      reason,
      attempts: 0,
      nextAttemptAt: now + this.config.baseBackoffMs,
    });
  }

  async drain(handler: (event: Record<string, any>) => Promise<void>): Promise<void> {
    const now = Date.now();
    const ready = this.items.filter((item) => item.nextAttemptAt <= now);
    const remaining = this.items.filter((item) => item.nextAttemptAt > now);
    this.items.length = 0;
    this.items.push(...remaining);

    for (const item of ready) {
      try {
        await handler(item.event);
      } catch (error) {
        const nextBackoff = Math.min(
          this.config.baseBackoffMs * 2 ** item.attempts,
          this.config.maxBackoffMs
        );
        const jitter = Math.floor(Math.random() * this.config.jitterMs);
        const nextAttemptAt = Date.now() + nextBackoff + jitter;
        this.items.push({
          event: item.event,
          reason: item.reason,
          attempts: item.attempts + 1,
          nextAttemptAt,
        });
        throw error;
      }
    }
  }

  size(): number {
    return this.items.length;
  }
}

export interface SourceConfig {
  id: string;
  owner: string;
  transport: "http" | "stream" | "s3";
  retentionDays: number;
  residency: string;
  killSwitch?: boolean;
  piiFields?: string[];
}

export class SourceRegistry {
  private readonly sources = new Map<string, SourceConfig>();

  register(source: SourceConfig): void {
    this.sources.set(source.id, { ...source, killSwitch: source.killSwitch ?? false });
  }

  enableKillSwitch(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    source.killSwitch = true;
  }

  disableKillSwitch(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    source.killSwitch = false;
  }

  get(sourceId: string): SourceConfig {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not registered`);
    }
    return source;
  }
}

export interface PipelineConfig {
  sourceId: string;
  schema: z.ZodSchema;
  rateShaper: TokenBucketRateShaper;
  dedupeWindow: DedupeWindow;
  sinks: Record<SinkRoute, Sink>;
  registry: SourceRegistry;
  dlq: DeadLetterQueue;
  route: (event: any) => SinkRoute;
  dedupeKey: (event: any) => string;
  cleaners?: Array<(event: any) => any>;
  enricher?: (event: any) => Promise<any> | any;
  piiFields?: string[];
  residencyAllowList?: string[];
  sloThresholdMs?: number;
}

export interface ProcessingResult {
  id: string;
  route: SinkRoute;
  durationMs: number;
}

export class IntelGraphPipeline {
  private readonly config: PipelineConfig;
  private readonly histogram = metrics
    .getMeter("intelgraph")
    .createHistogram("intelgraph.pipeline.duration", {
      description: "End-to-end processing duration in ms",
    });
  private readonly processedCounter = metrics
    .getMeter("intelgraph")
    .createCounter("intelgraph.pipeline.processed", { description: "Processed events" });
  private readonly droppedCounter = metrics
    .getMeter("intelgraph")
    .createCounter("intelgraph.pipeline.dropped", { description: "Dropped events" });
  private readonly latencies: number[] = [];

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  async process(event: Record<string, any>): Promise<ProcessingResult | null> {
    const source = this.config.registry.get(this.config.sourceId);
    if (source.killSwitch) {
      this.config.dlq.enqueue(event, "kill_switch");
      this.droppedCounter.add(1);
      return null;
    }

    await this.config.rateShaper.consume();
    const start = performance.now();
    let working = { ...event };

    try {
      working = this.config.schema.parse(working);
    } catch (error) {
      this.config.dlq.enqueue(event, "validation_failed");
      this.droppedCounter.add(1);
      return null;
    }

    if (
      this.config.residencyAllowList &&
      !this.config.residencyAllowList.includes(working.residency)
    ) {
      this.config.dlq.enqueue(event, "residency_blocked");
      this.droppedCounter.add(1);
      return null;
    }

    for (const cleaner of this.config.cleaners ?? []) {
      working = cleaner(working);
    }

    if (this.config.enricher) {
      working = await this.config.enricher(working);
    }

    const dedupeKey = this.config.dedupeKey(working);
    if (this.config.dedupeWindow.isDuplicate(dedupeKey, Date.now())) {
      this.droppedCounter.add(1);
      return null;
    }

    const piiFields = this.config.piiFields ?? source.piiFields ?? [];
    if (piiFields.length > 0) {
      working = this.redactFields(working, piiFields);
    }

    const route = this.config.route(working);
    const sink = this.config.sinks[route];
    await sink.write(working);

    const duration = performance.now() - start;
    this.histogram.record(duration);
    this.processedCounter.add(1);
    this.trackLatency(duration);

    return { id: working.id ?? randomUUID(), route, durationMs: duration };
  }

  async processBatch(events: Record<string, any>[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    for (const event of events) {
      const result = await this.process(event);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  async replayDeadLetter(handler: (event: Record<string, any>) => Promise<void>): Promise<void> {
    await this.config.dlq.drain(handler);
  }

  getP95Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, idx)];
  }

  private trackLatency(duration: number): void {
    this.latencies.push(duration);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
    if (this.config.sloThresholdMs && this.getP95Latency() > this.config.sloThresholdMs) {
      this.config.dlq.enqueue({ slo: "p95_exceeded" }, "slo_breach");
    }
  }

  private redactFields(event: Record<string, any>, fields: string[]): Record<string, any> {
    const clone: Record<string, any> = { ...event };
    for (const field of fields) {
      if (field in clone) {
        clone[field] = "[REDACTED]";
      }
    }
    return clone;
  }
}

export class InMemorySink implements Sink {
  public readonly name: string;
  public readonly events: Record<string, any>[] = [];
  private readonly failOn?: (event: Record<string, any>) => boolean;

  constructor(name: string, failOn?: (event: Record<string, any>) => boolean) {
    this.name = name;
    this.failOn = failOn;
  }

  async write(event: Record<string, any>): Promise<void> {
    if (this.failOn?.(event)) {
      throw new Error("sink_error");
    }
    this.events.push(event);
  }
}
