import Redis from 'ioredis';
import crypto from 'node:crypto';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';

export type GraphCacheInvalidationMessage = {
  keys?: string[];
  patterns?: string[];
  tenant?: string;
  origin?: string;
  reason?: string;
  timestamp?: number;
};

type InvalidationHandler = (message: GraphCacheInvalidationMessage) => void | Promise<void>;

const CHANNEL = process.env.GRAPH_CACHE_INVALIDATION_CHANNEL ?? 'graphql:cache:invalidate';

let subscriber: Redis | null = null;
let subscribing = false;
const handlers = new Set<InvalidationHandler>();

function baseClient(): Redis | null {
  if (process.env.REDIS_DISABLE === '1') {
    return null;
  }
  try {
    return getRedisClient();
  } catch (err) {
    logger.warn({ err }, 'Unable to obtain Redis client for graph cache');
    return null;
  }
}

async function ensureSubscriber(): Promise<void> {
  if (subscriber || subscribing) {
    return;
  }

  const client = baseClient();
  if (!client) {
    logger.warn('Graph cache invalidation subscriber not started - Redis unavailable');
    return;
  }

  try {
    subscribing = true;
    subscriber = client.duplicate();
    subscriber.on('error', (err) => {
      logger.error({ err }, 'Graph cache invalidation subscriber error');
    });

    subscriber.on('message', async (_channel, payload) => {
      try {
        const parsed: GraphCacheInvalidationMessage = JSON.parse(payload);
        for (const handler of handlers) {
          await handler(parsed);
        }
      } catch (err) {
        logger.error({ err, payload }, 'Failed to handle graph cache invalidation payload');
      }
    });

    await subscriber.subscribe(CHANNEL);
    logger.info({ channel: CHANNEL }, 'Subscribed to graph cache invalidation channel');
  } catch (err) {
    logger.error({ err }, 'Failed to subscribe to graph cache invalidation channel');
    if (subscriber) {
      try {
        subscriber.disconnect();
      } catch {}
    }
    subscriber = null;
  } finally {
    subscribing = false;
  }
}

export async function initializeGraphCacheInvalidation(): Promise<void> {
  await ensureSubscriber();
}

export function onGraphCacheInvalidation(handler: InvalidationHandler): void {
  handlers.add(handler);
  // Fire-and-forget subscription bootstrap
  void ensureSubscriber();
}

export async function publishInvalidation(message: GraphCacheInvalidationMessage): Promise<void> {
  const client = baseClient();
  if (!client) {
    return;
  }

  const enriched: GraphCacheInvalidationMessage = {
    ...message,
    origin: message.origin ?? process.env.HOSTNAME ?? 'unknown',
    timestamp: message.timestamp ?? Date.now(),
  };

  try {
    await client.publish(CHANNEL, JSON.stringify(enriched));
  } catch (err) {
    logger.error({ err, enriched }, 'Failed to publish graph cache invalidation');
  }
}

export function hashQuery(query: string | undefined, variables: unknown = {}): string {
  const h = crypto.createHash('sha1');
  if (query) {
    h.update(query);
  }
  h.update(JSON.stringify(variables ?? {}));
  return h.digest('hex');
}

export const DEFAULT_GRAPH_CACHE_TTL = Number(process.env.GRAPH_CACHE_TTL ?? '60');
