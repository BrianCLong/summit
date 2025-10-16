import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().default('7100'),
  HOST: z.string().default('0.0.0.0'),
  METRICS_PORT: z.string().default('9109'),
  GRANITE_DOCLING_ENDPOINT: z.string().url().optional(),
  GRANITE_DOCLING_API_KEY: z.string().optional(),
  GRANITE_DOCLING_MODEL_ID: z.string().default('granite-docling-258m'),
  GRANITE_DOCLING_MAX_TOKENS: z.string().default('2048'),
  GRANITE_DOCLING_TIMEOUT_MS: z.string().default('120000'),
  GRANITE_DOCLING_PRICE_PER_1K_CHARS: z.string().default('0.04'),
  PURPOSE_POLICY: z.string().default('docling/purpose_enforcement'),
  RETENTION_POLICY: z.string().default('docling/retention_enforcement'),
  LICENSE_POLICY: z.string().default('docling/license_enforcement'),
  MTLS_ENABLED: z.string().default('false'),
  MTLS_CERT_PATH: z.string().optional(),
  MTLS_KEY_PATH: z.string().optional(),
  MTLS_CA_PATH: z.string().optional(),
  CACHE_TTL_SECONDS: z.string().default('900'),
  MAX_CACHE_ENTRIES: z.string().default('500'),
  LOG_LEVEL: z.string().default('info'),
  OTEL_SERVICE_NAME: z.string().default('docling-svc'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type ServiceConfig = z.infer<typeof EnvSchema> & {
  port: number;
  metricsPort: number;
  timeoutMs: number;
  maxTokens: number;
  pricePer1kChars: number;
  cacheTtlSeconds: number;
  maxCacheEntries: number;
};

export const loadConfig = (): ServiceConfig => {
  const parsed = EnvSchema.parse(process.env);
  return {
    ...parsed,
    port: parseInt(parsed.PORT, 10),
    metricsPort: parseInt(parsed.METRICS_PORT, 10),
    timeoutMs: parseInt(parsed.GRANITE_DOCLING_TIMEOUT_MS, 10),
    maxTokens: parseInt(parsed.GRANITE_DOCLING_MAX_TOKENS, 10),
    pricePer1kChars: parseFloat(parsed.GRANITE_DOCLING_PRICE_PER_1K_CHARS),
    cacheTtlSeconds: parseInt(parsed.CACHE_TTL_SECONDS, 10),
    maxCacheEntries: parseInt(parsed.MAX_CACHE_ENTRIES, 10),
  };
};
