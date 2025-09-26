import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  JWKS_URI: z.string().url().optional(),
  JWT_AUD: z.string().optional(),
  JWT_ISS: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
  N8N_WEBHOOKS_ENABLED: z.string().default('true'),
  CORS_ORIGINS: z.string().optional(),
  DOCLING_SVC_URL: z.string().url().default('http://docling-svc.platform-ml.svc.cluster.local:7100'),
  DOCLING_SVC_TIMEOUT_MS: z.string().default('15000'),
  DOCLING_PURPOSE_POLICY: z.string().default('docling/purpose_enforcement'),
  DOCLING_RETENTION_POLICY: z.string().default('docling/retention_enforcement'),
  DOCLING_LICENSE_POLICY: z.string().default('docling/license_enforcement'),
  GRAPHQL_RATE_LIMIT_WINDOW_SECONDS: z.string().default('3600'),
  GRAPHQL_RATE_LIMIT_FREE_LIMIT: z.string().default('1000'),
  GRAPHQL_RATE_LIMIT_SUPERGROK_LIMIT: z.string().default('5000'),
  GRAPHQL_RATE_LIMIT_SUPERGROK_WINDOW_SECONDS: z.string().optional(),
  GRAPHQL_RATE_LIMIT_REDIS_URL: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
