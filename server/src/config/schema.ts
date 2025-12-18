import { z } from 'zod';

// Zod v4 compatibility types
export type ZodType<T = any> = z.ZodType<T>;
export type ZodError = z.ZodError;

export const ConfigSchema = z.object({
  env: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  port: z.coerce.number().default(4000),
  requireRealDbs: z.coerce.boolean().default(false),

  neo4j: z.object({
    uri: z.string().default('bolt://localhost:7687'),
    username: z.string().default('neo4j'),
    password: z.string().default('devpassword'),
    database: z.string().default('neo4j'),
  }),

  postgres: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    database: z.string().default('intelgraph_dev'),
    username: z.string().default('intelgraph'),
    password: z.string().default('devpassword'),
  }),

  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().default('devpassword'),
    db: z.coerce.number().default(0),
  }),

  jwt: z.object({
    secret: z.string().min(10).default('dev_jwt_secret_12345'),
    expiresIn: z.string().default('24h'),
    refreshSecret: z.string().min(10).default('dev_refresh_secret_67890'),
    refreshExpiresIn: z.string().default('7d'),
  }),

  bcrypt: z.object({
    rounds: z.coerce.number().default(12),
  }),

  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000),
    maxRequests: z.coerce.number().default(100),
  }),

  cors: z.object({
    origin: z.string().default('http://localhost:3000'),
  }),

  features: z.object({
    GRAPH_EXPAND_CACHE: z.coerce.boolean().default(true),
    AI_REQUEST_ENABLED: z.coerce.boolean().default(true),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
