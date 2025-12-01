/**
 * Configuration Management
 * Loads and validates environment variables
 */

import { z } from 'zod';
import { WebSocketConfig } from '../types/index.js';

const configSchema = z.object({
  PORT: z.string().default('9001').transform(Number),
  HOST: z.string().default('0.0.0.0'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.string().default('true').transform(v => v === 'true'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0').transform(Number),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ALGORITHM: z.string().default('HS256'),

  // Rate Limiting
  RATE_LIMIT_MAX_CONNECTIONS: z.string().default('10000').transform(Number),
  RATE_LIMIT_MESSAGES_PER_SECOND: z.string().default('100').transform(Number),
  RATE_LIMIT_BURST_SIZE: z.string().default('200').transform(Number),

  // Heartbeat
  HEARTBEAT_INTERVAL: z.string().default('30000').transform(Number),
  HEARTBEAT_TIMEOUT: z.string().default('60000').transform(Number),

  // Persistence
  PERSISTENCE_ENABLED: z.string().default('true').transform(v => v === 'true'),
  PERSISTENCE_TTL: z.string().default('3600').transform(Number),
  PERSISTENCE_MAX_MESSAGES: z.string().default('1000').transform(Number),

  // Clustering
  CLUSTERING_ENABLED: z.string().default('true').transform(v => v === 'true'),
  NODE_ID: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export function loadConfig(): WebSocketConfig {
  const env = configSchema.parse(process.env);

  // Production validation
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'dev-secret' || env.JWT_SECRET.length < 64) {
      throw new Error('Production requires a strong JWT_SECRET (min 64 characters)');
    }

    if (env.CORS_ORIGIN.includes('localhost')) {
      throw new Error('Production cannot use localhost in CORS_ORIGIN');
    }
  }

  const nodeId = env.NODE_ID || `ws-${Math.random().toString(36).substr(2, 9)}`;

  return {
    port: env.PORT,
    host: env.HOST,
    cors: {
      origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
      credentials: env.CORS_CREDENTIALS,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
    },
    jwt: {
      secret: env.JWT_SECRET,
      algorithm: env.JWT_ALGORITHM,
    },
    rateLimit: {
      maxConnections: env.RATE_LIMIT_MAX_CONNECTIONS,
      messageRatePerSecond: env.RATE_LIMIT_MESSAGES_PER_SECOND,
      burstSize: env.RATE_LIMIT_BURST_SIZE,
    },
    heartbeat: {
      interval: env.HEARTBEAT_INTERVAL,
      timeout: env.HEARTBEAT_TIMEOUT,
    },
    persistence: {
      enabled: env.PERSISTENCE_ENABLED,
      ttl: env.PERSISTENCE_TTL,
      maxMessages: env.PERSISTENCE_MAX_MESSAGES,
    },
    clustering: {
      enabled: env.CLUSTERING_ENABLED,
      nodeId,
    },
  };
}
