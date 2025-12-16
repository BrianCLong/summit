/**
 * Configuration Module
 *
 * Environment-based configuration for the Time-Series Metrics Platform.
 */

import { z } from 'zod';

// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================

const ConfigSchema = z.object({
  // Server configuration
  server: z.object({
    port: z.number().int().positive().default(8090),
    host: z.string().default('0.0.0.0'),
  }),

  // Database configuration
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().positive().default(5432),
    database: z.string().default('timeseries_metrics'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
    maxConnections: z.number().int().positive().default(20),
    idleTimeoutMs: z.number().int().positive().default(30000),
    ssl: z.boolean().default(false),
  }),

  // Redis configuration
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().positive().default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
  }),

  // Kafka configuration
  kafka: z.object({
    enabled: z.boolean().default(false),
    brokers: z.array(z.string()).default(['localhost:9092']),
    clientId: z.string().default('timeseries-metrics'),
    topic: z.string().default('metrics-ingest'),
  }),

  // Ingestion configuration
  ingestion: z.object({
    batchSize: z.number().int().positive().default(1000),
    batchTimeoutMs: z.number().int().positive().default(5000),
    maxClockSkewMs: z.number().int().positive().default(300000),
    futureTolerance: z.number().int().positive().default(60000),
    pastTolerance: z.number().int().positive().default(604800000), // 7 days
  }),

  // Query configuration
  query: z.object({
    defaultTimeout: z.number().int().positive().default(30000),
    maxTimeout: z.number().int().positive().default(300000),
    cacheEnabled: z.boolean().default(true),
    cacheTtlMs: z.number().int().positive().default(60000),
    maxConcurrentQueries: z.number().int().positive().default(100),
  }),

  // Storage configuration
  storage: z.object({
    hotRetention: z.string().default('7d'),
    warmRetention: z.string().default('30d'),
    coldRetention: z.string().default('365d'),
    downsamplingEnabled: z.boolean().default(true),
    downsamplingInterval: z.string().default('1h'),
    compressionEnabled: z.boolean().default(true),
  }),

  // Logging configuration
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }),

  // Feature flags
  features: z.object({
    sloCalculation: z.boolean().default(true),
    multiTenant: z.boolean().default(true),
    queryCache: z.boolean().default(true),
    kafkaIngestion: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

function getEnvString(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue?: boolean): boolean | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvArray(key: string, defaultValue?: string[]): string[] | undefined {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.split(',').map((s) => s.trim());
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const rawConfig = {
    server: {
      port: getEnvNumber('TIMESERIES_PORT', 8090),
      host: getEnvString('TIMESERIES_HOST', '0.0.0.0'),
    },
    database: {
      host: getEnvString('POSTGRES_HOST', 'localhost'),
      port: getEnvNumber('POSTGRES_PORT', 5432),
      database: getEnvString('POSTGRES_DB', 'timeseries_metrics'),
      user: getEnvString('POSTGRES_USER', 'postgres'),
      password: getEnvString('POSTGRES_PASSWORD', 'postgres'),
      maxConnections: getEnvNumber('POSTGRES_MAX_CONNECTIONS', 20),
      idleTimeoutMs: getEnvNumber('POSTGRES_IDLE_TIMEOUT', 30000),
      ssl: getEnvBoolean('POSTGRES_SSL', false),
    },
    redis: {
      host: getEnvString('REDIS_HOST', 'localhost'),
      port: getEnvNumber('REDIS_PORT', 6379),
      password: getEnvString('REDIS_PASSWORD'),
      db: getEnvNumber('REDIS_DB', 0),
    },
    kafka: {
      enabled: getEnvBoolean('KAFKA_ENABLED', false),
      brokers: getEnvArray('KAFKA_BROKERS', ['localhost:9092']),
      clientId: getEnvString('KAFKA_CLIENT_ID', 'timeseries-metrics'),
      topic: getEnvString('KAFKA_TOPIC', 'metrics-ingest'),
    },
    ingestion: {
      batchSize: getEnvNumber('INGESTION_BATCH_SIZE', 1000),
      batchTimeoutMs: getEnvNumber('INGESTION_BATCH_TIMEOUT_MS', 5000),
      maxClockSkewMs: getEnvNumber('INGESTION_MAX_CLOCK_SKEW_MS', 300000),
      futureTolerance: getEnvNumber('INGESTION_FUTURE_TOLERANCE_MS', 60000),
      pastTolerance: getEnvNumber('INGESTION_PAST_TOLERANCE_MS', 604800000),
    },
    query: {
      defaultTimeout: getEnvNumber('QUERY_DEFAULT_TIMEOUT_MS', 30000),
      maxTimeout: getEnvNumber('QUERY_MAX_TIMEOUT_MS', 300000),
      cacheEnabled: getEnvBoolean('QUERY_CACHE_ENABLED', true),
      cacheTtlMs: getEnvNumber('QUERY_CACHE_TTL_MS', 60000),
      maxConcurrentQueries: getEnvNumber('QUERY_MAX_CONCURRENT', 100),
    },
    storage: {
      hotRetention: getEnvString('STORAGE_HOT_RETENTION', '7d'),
      warmRetention: getEnvString('STORAGE_WARM_RETENTION', '30d'),
      coldRetention: getEnvString('STORAGE_COLD_RETENTION', '365d'),
      downsamplingEnabled: getEnvBoolean('STORAGE_DOWNSAMPLING_ENABLED', true),
      downsamplingInterval: getEnvString('STORAGE_DOWNSAMPLING_INTERVAL', '1h'),
      compressionEnabled: getEnvBoolean('STORAGE_COMPRESSION_ENABLED', true),
    },
    logging: {
      level: getEnvString('LOG_LEVEL', 'info') as Config['logging']['level'],
      format: getEnvString('LOG_FORMAT', 'json') as Config['logging']['format'],
    },
    features: {
      sloCalculation: getEnvBoolean('FEATURE_SLO_CALCULATION', true),
      multiTenant: getEnvBoolean('FEATURE_MULTI_TENANT', true),
      queryCache: getEnvBoolean('FEATURE_QUERY_CACHE', true),
      kafkaIngestion: getEnvBoolean('FEATURE_KAFKA_INGESTION', false),
    },
  };

  return ConfigSchema.parse(rawConfig);
}

/**
 * Default configuration
 */
export const defaultConfig = loadConfig();
