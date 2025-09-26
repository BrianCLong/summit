import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { PubSub } from 'graphql-subscriptions';
import logger from '../config/logger.js';

export interface MLStreamingPrediction {
  modelId: string;
  inferenceId: string;
  inputId?: string | null;
  predictions: unknown;
  metadata?: Record<string, unknown> | null;
  receivedAt: string;
  latencyMs: number;
}

export interface MLStreamingStatus {
  modelId: string;
  connected: boolean;
  lastHeartbeatAt?: string | null;
  averageLatencyMs?: number | null;
}

interface ModelState {
  lastHeartbeatAt?: string;
  latencies: number[];
}

interface MonitorOptions {
  redisUrl?: string;
  channel?: string;
  staleThresholdMs?: number;
  latencySampleSize?: number;
}

const DEFAULT_CHANNEL = process.env.ML_STREAM_REDIS_CHANNEL || 'ml:stream:inference';
const DEFAULT_STALE_THRESHOLD = 30_000;
const DEFAULT_SAMPLE_SIZE = 50;

export class MLStreamingMonitor {
  private readonly channel: string;
  private readonly statuses = new Map<string, ModelState>();
  private readonly staleThresholdMs: number;
  private readonly sampleSize: number;
  private readonly subscriber?: Redis;
  private started = false;

  constructor(
    private readonly pubsub: PubSub,
    options: MonitorOptions = {},
  ) {
    this.channel = options.channel || DEFAULT_CHANNEL;
    this.staleThresholdMs = options.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD;
    this.sampleSize = options.latencySampleSize ?? DEFAULT_SAMPLE_SIZE;

    const redisUrl = options.redisUrl || process.env.REDIS_URL;
    if (redisUrl) {
      this.subscriber = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
      });
      this.subscriber.on('error', (error) => {
        logger.error({ error }, 'ML streaming monitor Redis error');
      });
      this.start().catch((error) => {
        logger.error({ error }, 'Failed to start ML streaming monitor');
      });
    } else {
      logger.warn('ML streaming monitor started without REDIS_URL; subscriptions require Redis');
    }
  }

  async start(): Promise<void> {
    if (!this.subscriber || this.started) {
      return;
    }
    if (this.subscriber.status !== 'ready') {
      await this.subscriber.connect();
    }
    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', (_channel, message) => this.handleRawMessage(message));
    this.started = true;
    logger.info({ channel: this.channel }, 'ML streaming monitor subscribed to channel');
  }

  subscribe(modelId: string) {
    return this.pubsub.asyncIterator([this.channelName(modelId)]);
  }

  ingest(event: Record<string, unknown>): void {
    const normalized = this.normalizeEvent(event);
    if (!normalized) {
      return;
    }

    this.recordStatus(normalized.modelId, normalized.latencyMs, normalized.receivedAt);
    this.pubsub.publish(this.channelName(normalized.modelId), {
      mlInferenceStream: normalized,
    });
  }

  getStatus(modelId: string): MLStreamingStatus {
    const state = this.statuses.get(modelId);
    if (!state) {
      return {
        modelId,
        connected: false,
        lastHeartbeatAt: null,
        averageLatencyMs: null,
      };
    }

    const lastHeartbeat = state.lastHeartbeatAt || null;
    const isStale =
      !lastHeartbeat || Date.now() - new Date(lastHeartbeat).getTime() > this.staleThresholdMs;
    const average =
      state.latencies.length > 0
        ? state.latencies.reduce((sum, value) => sum + value, 0) / state.latencies.length
        : null;

    return {
      modelId,
      connected: !isStale,
      lastHeartbeatAt: lastHeartbeat,
      averageLatencyMs: average,
    };
  }

  private handleRawMessage(message: string): void {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      this.ingest(parsed);
    } catch (error) {
      logger.error({ error, message }, 'Failed to parse ML streaming payload');
    }
  }

  private normalizeEvent(event: Record<string, unknown>): MLStreamingPrediction | null {
    const modelId = (event['model_id'] || event['modelId']) as string | undefined;
    if (!modelId) {
      logger.warn({ event }, 'Discarded streaming payload without model identifier');
      return null;
    }

    const inferenceId =
      (event['inference_id'] as string | undefined) ||
      (event['inferenceId'] as string | undefined) ||
      randomUUID();
    const inputId = (event['input_id'] || event['inputId']) as string | undefined;
    const metadata =
      (event['metadata'] as Record<string, unknown> | undefined) ||
      (event['meta'] as Record<string, unknown> | undefined) ||
      null;
    const predictions = event['predictions'] ?? event['outputs'] ?? null;

    const latencyMsRaw =
      (event['latency_ms'] as number | undefined) ||
      (event['latencyMs'] as number | undefined) ||
      ((event['latency_seconds'] as number | undefined) ?? 0) * 1000;
    const latencyMs = typeof latencyMsRaw === 'number' ? latencyMsRaw : 0;

    const timestamp =
      (event['timestamp'] as string | undefined) ||
      (event['received_at'] as string | undefined) ||
      new Date().toISOString();

    return {
      modelId,
      inferenceId,
      inputId: inputId || null,
      metadata,
      predictions,
      latencyMs,
      receivedAt: timestamp,
    };
  }

  private recordStatus(modelId: string, latencyMs: number, receivedAt: string): void {
    const state = this.statuses.get(modelId) ?? { latencies: [] };
    state.lastHeartbeatAt = receivedAt;
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      state.latencies.push(latencyMs);
      if (state.latencies.length > this.sampleSize) {
        state.latencies.shift();
      }
    }
    this.statuses.set(modelId, state);
  }

  private channelName(modelId: string): string {
    return `ML_INFERENCE_STREAM_${modelId}`;
  }
}
