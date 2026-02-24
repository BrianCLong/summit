// @ts-nocheck
import * as z from 'zod';

// Zod v4 compatibility types
// Validated by Epic 1 Task 1.6
export type ZodType<T = any> = z.ZodType<T>;
export type ZodError = z.ZodError;

export const ConfigSchema = (z as any).object({
  env: (z as any).enum(['development', 'test', 'staging', 'production']).default('development'),
  port: (z as any).coerce.number().default(4000),
  requireRealDbs: (z as any).coerce.boolean().default(false),

  neo4j: (z as any).object({
    uri: (z as any).string().default('bolt://localhost:7687'),
    username: (z as any).string().default('neo4j'),
    password: (z as any).string().default('devpassword'),
    database: (z as any).string().default('neo4j'),
  }).default({}),

  postgres: (z as any).object({
    host: (z as any).string().default('localhost'),
    port: (z as any).coerce.number().default(5432),
    database: (z as any).string().default('intelgraph_dev'),
    username: (z as any).string().default('intelgraph'),
    password: (z as any).string().default('devpassword'),
  }).default({}),

  redis: (z as any).object({
    host: (z as any).string().default('localhost'),
    port: (z as any).coerce.number().default(6379),
    password: (z as any).string().default('devpassword'),
    db: (z as any).coerce.number().default(0),
    useCluster: (z as any).coerce.boolean().default(false),
    clusterNodes: (z as any).array((z as any).object({
      host: (z as any).string(),
      port: (z as any).coerce.number()
    })).default([]),
    tls: (z as any).coerce.boolean().default(false),
  }).default({}),

  jwt: (z as any).object({
    secret: (z as any).string().min(10).default('dev_jwt_secret_12345'),
    expiresIn: (z as any).string().default('24h'),
    refreshSecret: (z as any).string().min(10).default('dev_refresh_secret_67890'),
    refreshExpiresIn: (z as any).string().default('7d'),
  }).default({}),

  bcrypt: (z as any).object({
    rounds: (z as any).coerce.number().default(12),
  }).default({}),

  rateLimit: (z as any).object({
    windowMs: (z as any).coerce.number().default(15 * 60 * 1000),
    maxRequests: (z as any).coerce.number().default(100),
  }).default({}),

  cors: (z as any).object({
    origin: (z as any).string().default('http://localhost:3000'),
  }).default({}),

  cache: (z as any).object({
    staleWhileRevalidateSeconds: (z as any).coerce.number().default(300),
  }).default({}),

  cdn: (z as any).object({
    enabled: (z as any).coerce.boolean().default(false),
    browserTtlSeconds: (z as any).coerce.number().default(60),
    edgeTtlSeconds: (z as any).coerce.number().default(300),
    surrogateKeyNamespace: (z as any).string().default('summit'),
  }).default({}),

  features: (z as any).object({
    GRAPH_EXPAND_CACHE: (z as any).coerce.boolean().default(true),
    AI_REQUEST_ENABLED: (z as any).coerce.boolean().default(true),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
