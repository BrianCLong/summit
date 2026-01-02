// @ts-nocheck
import { z } from 'zod';

// Zod v4 compatibility types
// Validated by Epic 1 Task 1.6
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
  }).default({}),

  postgres: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    database: z.string().default('intelgraph_dev'),
    username: z.string().default('intelgraph'),
    password: z.string().default('devpassword'),
  }).default({}),

  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().default('devpassword'),
    db: z.coerce.number().default(0),
  }).default({}),

  jwt: z.object({
    secret: z.string().min(10).default('dev_jwt_secret_12345'),
    expiresIn: z.string().default('24h'),
    refreshSecret: z.string().min(10).default('dev_refresh_secret_67890'),
    refreshExpiresIn: z.string().default('7d'),
  }).default({}),

  bcrypt: z.object({
    rounds: z.coerce.number().default(12),
  }).default({}),

  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000),
    maxRequests: z.coerce.number().default(100),
  }).default({}),

  cors: z.object({
    origin: z.string().default('http://localhost:3000'),
  }).default({}),

  features: z.object({
    GRAPH_EXPAND_CACHE: z.coerce.boolean().default(true),
    AI_REQUEST_ENABLED: z.coerce.boolean().default(true),
  }).default({}),

  services: z.object({
    POLICY_COMPILER_URL: z.string().url().default('http://localhost:4000'),
    PROV_LEDGER_URL: z.string().url().default('http://localhost:4010'),
    NLQ_SERVICE_URL: z.string().url().default('http://localhost:4020'),
    ER_SERVICE_URL: z.string().url().default('http://localhost:8104'),
    INGEST_SERVICE_URL: z.string().url().default('http://localhost:8105'),
    ZK_TX_SERVICE_URL: z.string().url().default('http://localhost:8106'),
    PREDICTD_PORT: z.coerce.number().default(4001),
  }).default({
    POLICY_COMPILER_URL: 'http://localhost:4000',
    PROV_LEDGER_URL: 'http://localhost:4010',
    NLQ_SERVICE_URL: 'http://localhost:4020',
    ER_SERVICE_URL: 'http://localhost:8104',
    INGEST_SERVICE_URL: 'http://localhost:8105',
    ZK_TX_SERVICE_URL: 'http://localhost:8106',
    PREDICTD_PORT: 4001,
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
