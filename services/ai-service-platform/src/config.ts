import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(4100),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
  }),
  postgres: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    database: z.string().default('ai_platform'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
  }),
  opa: z.object({
    url: z.string().default('http://localhost:8181'),
  }),
  kubernetes: z.object({
    namespace: z.string().default('ai-services'),
    inCluster: z.boolean().default(false),
  }),
  compliance: z.object({
    fedrampEnabled: z.boolean().default(false),
    auditRetentionDays: z.coerce.number().default(365),
  }),
});

export const config = configSchema.parse({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.AI_PLATFORM_PORT,
  logLevel: process.env.LOG_LEVEL,
  corsOrigins: process.env.CORS_ORIGINS?.split(','),
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },
  opa: {
    url: process.env.OPA_URL,
  },
  kubernetes: {
    namespace: process.env.K8S_NAMESPACE,
    inCluster: process.env.K8S_IN_CLUSTER === 'true',
  },
  compliance: {
    fedrampEnabled: process.env.FEDRAMP_ENABLED === 'true',
    auditRetentionDays: process.env.AUDIT_RETENTION_DAYS,
  },
});

export type Config = z.infer<typeof configSchema>;
