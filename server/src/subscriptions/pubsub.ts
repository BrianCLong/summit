import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function makePubSub() {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('REDIS_URL not provided, using in-memory PubSub');
    return new PubSub(); // dev in-memory
  }

  try {
    const opts = { 
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxmemoryPolicy: 'noeviction'
    };

    const publisher = new Redis(url, opts);
    const subscriber = new Redis(url, opts);
    
    // Store reference for health checks
    redisClient = publisher;

    // Error handling
    publisher.on('error', (err) => {
      console.error('Redis Publisher Error:', err);
    });

    subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    console.log('Using Redis PubSub for subscriptions');
    return new RedisPubSub({ publisher, subscriber });
  } catch (error) {
    console.error('Failed to connect to Redis, falling back to in-memory PubSub:', error);
    return new PubSub();
  }
}

export const redis = {
  healthCheck: async (): Promise<boolean> => {
    if (!redisClient) {
      return false;
    }
    try {
      const result = await redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  },

  // Cache for OPA decisions with TTL
  setWithTTL: async (key: string, value: string, ttlSeconds: number = 300) => {
    if (!redisClient) return false;
    try {
      await redisClient.setex(key, ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Redis setWithTTL failed:', error);
      return false;
    }
  },

  get: async (key: string): Promise<string | null> => {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis get failed:', error);
      return null;
    }
  }
};