/**
 * Signal Bus Service Configuration
 *
 * Centralized configuration management with environment variable support,
 * validation, and sensible defaults.
 *
 * @module config
 */

import { z } from 'zod';

/**
 * Configuration schema with validation
 */
const ConfigSchema = z.object({
  // Service identity
  serviceName: z.string().default('signal-bus-service'),
  serviceVersion: z.string().default('1.0.0'),
  nodeId: z.string().default(() => `node-${process.pid}`),

  // Server configuration
  server: z.object({
    port: z.number().min(1).max(65535).default(3100),
    host: z.string().default('0.0.0.0'),
    shutdownTimeoutMs: z.number().positive().default(30000),
  }),

  // Kafka configuration
  kafka: z.object({
    brokers: z.array(z.string()).min(1),
    clientId: z.string().default('signal-bus-service'),
    connectionTimeout: z.number().positive().default(10000),
    requestTimeout: z.number().positive().default(30000),
    ssl: z.boolean().default(false),
    sasl: z
      .object({
        mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']),
        username: z.string(),
        password: z.string(),
      })
      .optional(),
  }),

  // Consumer configuration
  consumer: z.object({
    groupId: z.string().default('signal-bus-service'),
    sessionTimeout: z.number().positive().default(30000),
    heartbeatInterval: z.number().positive().default(3000),
    maxBytesPerPartition: z.number().positive().default(1048576),
    maxWaitTimeInMs: z.number().positive().default(5000),
    autoCommit: z.boolean().default(false),
    autoCommitInterval: z.number().positive().default(5000),
    fromBeginning: z.boolean().default(false),
  }),

  // Producer configuration
  producer: z.object({
    acks: z.enum(['-1', '0', '1']).transform((v) => parseInt(v, 10)).default('-1'),
    compression: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).default('lz4'),
    maxInFlightRequests: z.number().positive().default(5),
    idempotent: z.boolean().default(true),
    transactionalId: z.string().optional(),
  }),

  // Redis configuration (for state, caching, rate limiting)
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.number().min(0).max(15).default(0),
    keyPrefix: z.string().default('signal-bus:'),
    maxRetriesPerRequest: z.number().nonnegative().default(3),
    connectTimeout: z.number().positive().default(10000),
  }),

  // Processing configuration
  processing: z.object({
    // Batch processing
    batchSize: z.number().positive().default(100),
    batchTimeoutMs: z.number().positive().default(1000),

    // Parallelism
    concurrency: z.number().positive().default(10),
    partitionConcurrency: z.number().positive().default(4),

    // Retry configuration
    maxRetries: z.number().nonnegative().default(3),
    retryDelayMs: z.number().positive().default(1000),
    retryBackoffMultiplier: z.number().positive().default(2),
    maxRetryDelayMs: z.number().positive().default(30000),

    // Timeouts
    processingTimeoutMs: z.number().positive().default(30000),
    enrichmentTimeoutMs: z.number().positive().default(5000),
  }),

  // Backpressure configuration
  backpressure: z.object({
    enabled: z.boolean().default(true),
    maxQueueSize: z.number().positive().default(10000),
    highWaterMark: z.number().positive().default(8000),
    lowWaterMark: z.number().positive().default(2000),
    spillToDisk: z.boolean().default(true),
    spillDirectory: z.string().default('/tmp/signal-bus-spill'),
    maxSpillSizeBytes: z.number().positive().default(1073741824), // 1GB
    pauseOnHighWaterMark: z.boolean().default(true),
  }),

  // Enrichment configuration
  enrichment: z.object({
    enabled: z.boolean().default(true),
    geoIp: z.object({
      enabled: z.boolean().default(true),
      databasePath: z.string().optional(),
      cacheSize: z.number().positive().default(10000),
      cacheTtlMs: z.number().positive().default(3600000), // 1 hour
    }),
    deviceLookup: z.object({
      enabled: z.boolean().default(true),
      cacheSize: z.number().positive().default(10000),
      cacheTtlMs: z.number().positive().default(300000), // 5 minutes
    }),
  }),

  // Rule engine configuration
  ruleEngine: z.object({
    enabled: z.boolean().default(true),
    maxRulesPerSignal: z.number().positive().default(100),
    evaluationTimeoutMs: z.number().positive().default(5000),
    alertDeduplicationWindowMs: z.number().positive().default(300000), // 5 minutes
    patternMatcherWindowMs: z.number().positive().default(60000), // 1 minute
  }),

  // Metrics configuration
  metrics: z.object({
    enabled: z.boolean().default(true),
    port: z.number().min(1).max(65535).default(9090),
    path: z.string().default('/metrics'),
    prefix: z.string().default('signal_bus_'),
    lagCheckIntervalMs: z.number().positive().default(10000),
    histogramBuckets: z.array(z.number()).default([0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]),
  }),

  // Logging configuration
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    prettyPrint: z.boolean().default(false),
    redactPaths: z.array(z.string()).default(['payload.password', 'payload.secret', 'headers.authorization']),
  }),

  // Health check configuration
  health: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/health'),
    readyPath: z.string().default('/health/ready'),
    livePath: z.string().default('/health/live'),
    detailedPath: z.string().default('/health/detailed'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): Partial<Config> {
  return {
    serviceName: process.env.SERVICE_NAME,
    serviceVersion: process.env.SERVICE_VERSION,
    nodeId: process.env.NODE_ID,

    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
      host: process.env.HOST,
      shutdownTimeoutMs: process.env.SHUTDOWN_TIMEOUT_MS
        ? parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10)
        : undefined,
    },

    kafka: {
      brokers: process.env.KAFKA_BROKERS?.split(',').map((b) => b.trim()) ?? ['localhost:9092'],
      clientId: process.env.KAFKA_CLIENT_ID,
      connectionTimeout: process.env.KAFKA_CONNECTION_TIMEOUT
        ? parseInt(process.env.KAFKA_CONNECTION_TIMEOUT, 10)
        : undefined,
      requestTimeout: process.env.KAFKA_REQUEST_TIMEOUT
        ? parseInt(process.env.KAFKA_REQUEST_TIMEOUT, 10)
        : undefined,
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_USERNAME
        ? {
            mechanism: (process.env.KAFKA_SASL_MECHANISM as any) ?? 'plain',
            username: process.env.KAFKA_SASL_USERNAME,
            password: process.env.KAFKA_SASL_PASSWORD ?? '',
          }
        : undefined,
    },

    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
    },

    processing: {
      batchSize: process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE, 10) : undefined,
      concurrency: process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : undefined,
    },

    logging: {
      level: process.env.LOG_LEVEL as any,
      prettyPrint: process.env.LOG_PRETTY === 'true',
    },
  };
}

/**
 * Deep merge configuration objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key as keyof T];
    const targetValue = target[key as keyof T];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key as keyof T] = deepMerge(targetValue, sourceValue);
    } else {
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Default configuration values
 */
const defaultConfig: Config = {
  serviceName: 'signal-bus-service',
  serviceVersion: '1.0.0',
  nodeId: `node-${process.pid}`,

  server: {
    port: 3100,
    host: '0.0.0.0',
    shutdownTimeoutMs: 30000,
  },

  kafka: {
    brokers: ['localhost:9092'],
    clientId: 'signal-bus-service',
    connectionTimeout: 10000,
    requestTimeout: 30000,
    ssl: false,
  },

  consumer: {
    groupId: 'signal-bus-service',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
    maxWaitTimeInMs: 5000,
    autoCommit: false,
    autoCommitInterval: 5000,
    fromBeginning: false,
  },

  producer: {
    acks: -1,
    compression: 'lz4',
    maxInFlightRequests: 5,
    idempotent: true,
  },

  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'signal-bus:',
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  },

  processing: {
    batchSize: 100,
    batchTimeoutMs: 1000,
    concurrency: 10,
    partitionConcurrency: 4,
    maxRetries: 3,
    retryDelayMs: 1000,
    retryBackoffMultiplier: 2,
    maxRetryDelayMs: 30000,
    processingTimeoutMs: 30000,
    enrichmentTimeoutMs: 5000,
  },

  backpressure: {
    enabled: true,
    maxQueueSize: 10000,
    highWaterMark: 8000,
    lowWaterMark: 2000,
    spillToDisk: true,
    spillDirectory: '/tmp/signal-bus-spill',
    maxSpillSizeBytes: 1073741824,
    pauseOnHighWaterMark: true,
  },

  enrichment: {
    enabled: true,
    geoIp: {
      enabled: true,
      cacheSize: 10000,
      cacheTtlMs: 3600000,
    },
    deviceLookup: {
      enabled: true,
      cacheSize: 10000,
      cacheTtlMs: 300000,
    },
  },

  ruleEngine: {
    enabled: true,
    maxRulesPerSignal: 100,
    evaluationTimeoutMs: 5000,
    alertDeduplicationWindowMs: 300000,
    patternMatcherWindowMs: 60000,
  },

  metrics: {
    enabled: true,
    port: 9090,
    path: '/metrics',
    prefix: 'signal_bus_',
    lagCheckIntervalMs: 10000,
    histogramBuckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  },

  logging: {
    level: 'info',
    prettyPrint: false,
    redactPaths: ['payload.password', 'payload.secret', 'headers.authorization'],
  },

  health: {
    enabled: true,
    path: '/health',
    readyPath: '/health/ready',
    livePath: '/health/live',
    detailedPath: '/health/detailed',
  },
};

/**
 * Load and validate configuration
 */
export function loadConfig(overrides?: Partial<Config>): Config {
  const envConfig = loadFromEnv();
  const merged = deepMerge(deepMerge(defaultConfig, envConfig), overrides ?? {});

  const result = ConfigSchema.safeParse(merged);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}

/**
 * Singleton config instance
 */
let configInstance: Config | null = null;

/**
 * Get the current configuration (loads if not already loaded)
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Set configuration (for testing)
 */
export function setConfig(config: Config): void {
  configInstance = config;
}
