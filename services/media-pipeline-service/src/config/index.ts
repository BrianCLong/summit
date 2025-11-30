/**
 * Media Pipeline Service Configuration
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  // Server
  port: z.coerce.number().default(4020),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Database
  databaseUrl: z.string().default('postgres://postgres:postgres@localhost:5432/media_pipeline'),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),

  // Service URLs
  graphCoreUrl: z.string().default('http://localhost:3001'),
  provLedgerUrl: z.string().default('http://localhost:4010'),
  spacetimeUrl: z.string().default('http://localhost:4030'),
  queueManagerUrl: z.string().default('http://localhost:3010'),

  // Storage
  storageProvider: z.enum(['local', 's3', 'gcs', 'azure', 'minio']).default('local'),
  storageBucket: z.string().default('media-assets'),
  storageRegion: z.string().optional(),
  storageEndpoint: z.string().optional(),
  localStoragePath: z.string().default('/tmp/media-pipeline'),

  // STT Providers
  sttDefaultProvider: z.string().default('mock'),
  sttOpenAIApiKey: z.string().optional(),
  sttAWSRegion: z.string().optional(),
  sttGoogleCredentials: z.string().optional(),
  sttAzureKey: z.string().optional(),
  sttAzureRegion: z.string().optional(),

  // Diarization
  diarizationDefaultProvider: z.string().default('mock'),
  diarizationPyAnnoteModel: z.string().optional(),

  // Processing
  maxFileSizeBytes: z.coerce.number().default(500 * 1024 * 1024), // 500MB
  maxDurationMs: z.coerce.number().default(4 * 60 * 60 * 1000), // 4 hours
  maxConcurrentJobs: z.coerce.number().default(10),
  jobTimeoutMs: z.coerce.number().default(30 * 60 * 1000), // 30 minutes
  maxRetries: z.coerce.number().default(3),
  retryDelayMs: z.coerce.number().default(5000),

  // Policy
  policyDryRun: z.coerce.boolean().default(false),
  defaultRetentionDays: z.coerce.number().default(365),
  enableAutoRedaction: z.coerce.boolean().default(true),

  // CORS
  corsOrigin: z.string().default('http://localhost:3000'),

  // Auth
  authorityId: z.string().default('media-pipeline-service'),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const rawConfig = {
    port: process.env.PORT,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    graphCoreUrl: process.env.GRAPH_CORE_URL,
    provLedgerUrl: process.env.PROV_LEDGER_URL,
    spacetimeUrl: process.env.SPACETIME_URL,
    queueManagerUrl: process.env.QUEUE_MANAGER_URL,
    storageProvider: process.env.STORAGE_PROVIDER,
    storageBucket: process.env.STORAGE_BUCKET,
    storageRegion: process.env.STORAGE_REGION,
    storageEndpoint: process.env.STORAGE_ENDPOINT,
    localStoragePath: process.env.LOCAL_STORAGE_PATH,
    sttDefaultProvider: process.env.STT_DEFAULT_PROVIDER,
    sttOpenAIApiKey: process.env.OPENAI_API_KEY,
    sttAWSRegion: process.env.AWS_REGION,
    sttGoogleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    sttAzureKey: process.env.AZURE_SPEECH_KEY,
    sttAzureRegion: process.env.AZURE_SPEECH_REGION,
    diarizationDefaultProvider: process.env.DIARIZATION_DEFAULT_PROVIDER,
    diarizationPyAnnoteModel: process.env.PYANNOTE_MODEL,
    maxFileSizeBytes: process.env.MAX_FILE_SIZE_BYTES,
    maxDurationMs: process.env.MAX_DURATION_MS,
    maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS,
    jobTimeoutMs: process.env.JOB_TIMEOUT_MS,
    maxRetries: process.env.MAX_RETRIES,
    retryDelayMs: process.env.RETRY_DELAY_MS,
    policyDryRun: process.env.POLICY_DRY_RUN,
    defaultRetentionDays: process.env.DEFAULT_RETENTION_DAYS,
    enableAutoRedaction: process.env.ENABLE_AUTO_REDACTION,
    corsOrigin: process.env.CORS_ORIGIN,
    authorityId: process.env.AUTHORITY_ID,
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.flatten());
    throw new Error(`Invalid configuration: ${JSON.stringify(result.error.flatten())}`);
  }

  return result.data;
}

export const config = loadConfig();
export default config;
