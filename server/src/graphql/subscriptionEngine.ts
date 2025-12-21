import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import pino from 'pino';
import { PubSub } from 'graphql-subscriptions';
import type { RedisPubSub } from 'graphql-redis-subscriptions';
import { makePubSub } from '../subscriptions/pubsub.js';
import {
  subscriptionBackpressureTotal,
  subscriptionBatchesEmitted,
  subscriptionFanoutLatency,
  websocketConnectionsActive,
} from '../metrics.js';

export interface SubscriptionMetadata {
  tenantId?: string;
  userId?: string;
  investigationId?: string;
  type?: string;
}

export interface SubscriptionEnvelope<T> {
  id: string;
  payload: T;
  timestamp: number;
  metadata?: SubscriptionMetadata;
}

export interface SubscriptionEngineOptions {
  pubsub?: PubSub | RedisPubSub;
  backpressureBytes?: number;
  batchFlushIntervalMs?: number;
}

export class SubscriptionEngine {
  private readonly pubsub: PubSub | RedisPubSub;
  private readonly logger = pino({ name: 'SubscriptionEngine' });
  private readonly connections = new Map<
    string,
    { socket: WebSocket; subscriptions: Set<string> }
  >();
  private readonly backpressureBytes: number;
  private readonly batchFlushIntervalMs: number;

  constructor(options: SubscriptionEngineOptions = {}) {
    this.pubsub = options.pubsub ?? makePubSub();
    this.backpressureBytes = options.backpressureBytes ?? 512 * 1024; // 512KB
    this.batchFlushIntervalMs = options.batchFlushIntervalMs ?? 250;
  }

  getPubSub() {
    return this.pubsub;
  }

  registerConnection(id: string, socket: WebSocket) {
    this.connections.set(id, { socket, subscriptions: new Set() });
    websocketConnectionsActive.inc();
    this.logger.info({ id }, 'Registered GraphQL WebSocket connection');
  }

  unregisterConnection(id: string) {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      websocketConnectionsActive.dec();
      this.logger.info({ id }, 'Closed GraphQL WebSocket connection');
    }
  }

  trackSubscription(connectionId: string, subscriptionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(subscriptionId);
    }
  }

  completeSubscription(connectionId: string, subscriptionId?: string) {
    const connection = this.connections.get(connectionId);
    if (connection && subscriptionId) {
      connection.subscriptions.delete(subscriptionId);
    }
  }

  enforceBackpressure(socket: WebSocket) {
    if (socket.bufferedAmount > this.backpressureBytes) {
      subscriptionBackpressureTotal.inc();
      socket.close(1013, 'Backpressure threshold exceeded');
      return false;
    }
    return true;
  }

  async publish<T>(
    trigger: string,
    payload: T,
    metadata?: SubscriptionMetadata,
  ) {
    const envelope: SubscriptionEnvelope<T> = {
      id: randomUUID(),
      payload,
      timestamp: Date.now(),
      metadata,
    };
    await this.pubsub.publish(trigger, envelope);
  }

  createFilteredAsyncIterator<T>(
    triggers: string | string[],
    predicate: (event: SubscriptionEnvelope<T>) => boolean | Promise<boolean>,
  ): AsyncIterable<SubscriptionEnvelope<T>> {
    const iterator = this.pubsub.asyncIterator<SubscriptionEnvelope<T>>(triggers);

    const filter = async function* () {
      for await (const event of iterator as any) {
        if (await predicate(event)) {
          yield event as SubscriptionEnvelope<T>;
        }
      }
    }();

    return filter;
  }

  createBatchedAsyncIterator<T>(
    triggers: string | string[],
    predicate: (event: SubscriptionEnvelope<T>) => boolean | Promise<boolean>,
    options?: { batchSize?: number; flushIntervalMs?: number },
  ): AsyncIterable<SubscriptionEnvelope<T>[]> {
    const source = this.createFilteredAsyncIterator(triggers, predicate);
    const batchSize = options?.batchSize ?? 25;
    const flushInterval = options?.flushIntervalMs ?? this.batchFlushIntervalMs;

    const iterator = async function* () {
      const queue: SubscriptionEnvelope<T>[] = [];
      let active = true;

      (async () => {
        for await (const event of source as any) {
          queue.push(event as SubscriptionEnvelope<T>);
        }
        active = false;
      })();

      while (active || queue.length) {
        if (!queue.length) {
          await new Promise((resolve) => setTimeout(resolve, flushInterval));
          continue;
        }

        const batch = queue.splice(0, batchSize);
        subscriptionBatchesEmitted.observe(batch.length);
        yield batch;

        if (queue.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, flushInterval));
        }
      }
    }();

    return iterator;
  }

  recordFanout(start: bigint) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    subscriptionFanoutLatency.observe(durationMs);
  }
}

export const subscriptionEngine = new SubscriptionEngine();
