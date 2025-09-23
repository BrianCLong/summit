import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

export function makePubSub() {
  const url = process.env.REDIS_URL;

  // S6.2 Dependency Faults: Inject transient faults (placeholder)
  if (Math.random() < 0.005) { // 0.5% chance of Redis connection error
    console.warn("Simulating Redis transient fault: Connection error.");
    // In a real scenario, this would prevent connection or cause operations to fail.
    // For this placeholder, we'll just return an in-memory PubSub to simulate a degraded state.
    return new PubSub();
  }

  if (!url) return new PubSub(); // dev in-memory
  const opts = { maxRetriesPerRequest: 1, enableOfflineQueue: false } as any;
  const publisher = new Redis(url, opts);
  const subscriber = new Redis(url, opts);
  return new RedisPubSub({ publisher, subscriber });
}