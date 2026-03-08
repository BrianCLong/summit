"use strict";
/**
 * Signal Bus Service Configuration
 *
 * Centralized configuration management with environment variable support,
 * validation, and sensible defaults.
 *
 * @module config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
exports.setConfig = setConfig;
const zod_1 = require("zod");
/**
 * Configuration schema with validation
 */
const ConfigSchema = zod_1.z.object({
    // Service identity
    serviceName: zod_1.z.string().default('signal-bus-service'),
    serviceVersion: zod_1.z.string().default('1.0.0'),
    nodeId: zod_1.z.string().default(() => `node-${process.pid}`),
    // Server configuration
    server: zod_1.z.object({
        port: zod_1.z.number().min(1).max(65535).default(3100),
        host: zod_1.z.string().default('0.0.0.0'),
        shutdownTimeoutMs: zod_1.z.number().positive().default(30000),
    }),
    // Kafka configuration
    kafka: zod_1.z.object({
        brokers: zod_1.z.array(zod_1.z.string()).min(1),
        clientId: zod_1.z.string().default('signal-bus-service'),
        connectionTimeout: zod_1.z.number().positive().default(10000),
        requestTimeout: zod_1.z.number().positive().default(30000),
        ssl: zod_1.z.boolean().default(false),
        sasl: zod_1.z
            .object({
            mechanism: zod_1.z.enum(['plain', 'scram-sha-256', 'scram-sha-512']),
            username: zod_1.z.string(),
            password: zod_1.z.string(),
        })
            .optional(),
    }),
    // Consumer configuration
    consumer: zod_1.z.object({
        groupId: zod_1.z.string().default('signal-bus-service'),
        sessionTimeout: zod_1.z.number().positive().default(30000),
        heartbeatInterval: zod_1.z.number().positive().default(3000),
        maxBytesPerPartition: zod_1.z.number().positive().default(1048576),
        maxWaitTimeInMs: zod_1.z.number().positive().default(5000),
        autoCommit: zod_1.z.boolean().default(false),
        autoCommitInterval: zod_1.z.number().positive().default(5000),
        fromBeginning: zod_1.z.boolean().default(false),
    }),
    // Producer configuration
    producer: zod_1.z.object({
        acks: zod_1.z.enum(['-1', '0', '1']).transform((v) => parseInt(v, 10)).default('-1'),
        compression: zod_1.z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).default('lz4'),
        maxInFlightRequests: zod_1.z.number().positive().default(5),
        idempotent: zod_1.z.boolean().default(true),
        transactionalId: zod_1.z.string().optional(),
    }),
    // Redis configuration (for state, caching, rate limiting)
    redis: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.number().min(1).max(65535).default(6379),
        password: zod_1.z.string().optional(),
        db: zod_1.z.number().min(0).max(15).default(0),
        keyPrefix: zod_1.z.string().default('signal-bus:'),
        maxRetriesPerRequest: zod_1.z.number().nonnegative().default(3),
        connectTimeout: zod_1.z.number().positive().default(10000),
    }),
    // Processing configuration
    processing: zod_1.z.object({
        // Batch processing
        batchSize: zod_1.z.number().positive().default(100),
        batchTimeoutMs: zod_1.z.number().positive().default(1000),
        // Parallelism
        concurrency: zod_1.z.number().positive().default(10),
        partitionConcurrency: zod_1.z.number().positive().default(4),
        // Retry configuration
        maxRetries: zod_1.z.number().nonnegative().default(3),
        retryDelayMs: zod_1.z.number().positive().default(1000),
        retryBackoffMultiplier: zod_1.z.number().positive().default(2),
        maxRetryDelayMs: zod_1.z.number().positive().default(30000),
        // Timeouts
        processingTimeoutMs: zod_1.z.number().positive().default(30000),
        enrichmentTimeoutMs: zod_1.z.number().positive().default(5000),
    }),
    // Backpressure configuration
    backpressure: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        maxQueueSize: zod_1.z.number().positive().default(10000),
        highWaterMark: zod_1.z.number().positive().default(8000),
        lowWaterMark: zod_1.z.number().positive().default(2000),
        spillToDisk: zod_1.z.boolean().default(true),
        spillDirectory: zod_1.z.string().default('/tmp/signal-bus-spill'),
        maxSpillSizeBytes: zod_1.z.number().positive().default(1073741824), // 1GB
        pauseOnHighWaterMark: zod_1.z.boolean().default(true),
    }),
    // Enrichment configuration
    enrichment: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        geoIp: zod_1.z.object({
            enabled: zod_1.z.boolean().default(true),
            databasePath: zod_1.z.string().optional(),
            cacheSize: zod_1.z.number().positive().default(10000),
            cacheTtlMs: zod_1.z.number().positive().default(3600000), // 1 hour
        }),
        deviceLookup: zod_1.z.object({
            enabled: zod_1.z.boolean().default(true),
            cacheSize: zod_1.z.number().positive().default(10000),
            cacheTtlMs: zod_1.z.number().positive().default(300000), // 5 minutes
        }),
    }),
    // Rule engine configuration
    ruleEngine: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        maxRulesPerSignal: zod_1.z.number().positive().default(100),
        evaluationTimeoutMs: zod_1.z.number().positive().default(5000),
        alertDeduplicationWindowMs: zod_1.z.number().positive().default(300000), // 5 minutes
        patternMatcherWindowMs: zod_1.z.number().positive().default(60000), // 1 minute
    }),
    // Metrics configuration
    metrics: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        port: zod_1.z.number().min(1).max(65535).default(9090),
        path: zod_1.z.string().default('/metrics'),
        prefix: zod_1.z.string().default('signal_bus_'),
        lagCheckIntervalMs: zod_1.z.number().positive().default(10000),
        histogramBuckets: zod_1.z.array(zod_1.z.number()).default([0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]),
    }),
    // Logging configuration
    logging: zod_1.z.object({
        level: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
        prettyPrint: zod_1.z.boolean().default(false),
        redactPaths: zod_1.z.array(zod_1.z.string()).default(['payload.password', 'payload.secret', 'headers.authorization']),
    }),
    // Health check configuration
    health: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        path: zod_1.z.string().default('/health'),
        readyPath: zod_1.z.string().default('/health/ready'),
        livePath: zod_1.z.string().default('/health/live'),
        detailedPath: zod_1.z.string().default('/health/detailed'),
    }),
});
/**
 * Load configuration from environment variables
 */
function loadFromEnv() {
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
                    mechanism: process.env.KAFKA_SASL_MECHANISM ?? 'plain',
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
            level: process.env.LOG_LEVEL,
            prettyPrint: process.env.LOG_PRETTY === 'true',
        },
    };
}
/**
 * Deep merge configuration objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = target[key];
        if (sourceValue === undefined) {
            continue;
        }
        if (typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else {
            result[key] = sourceValue;
        }
    }
    return result;
}
/**
 * Default configuration values
 */
const defaultConfig = {
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
function loadConfig(overrides) {
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
let configInstance = null;
/**
 * Get the current configuration (loads if not already loaded)
 */
function getConfig() {
    if (!configInstance) {
        configInstance = loadConfig();
    }
    return configInstance;
}
/**
 * Reset configuration (for testing)
 */
function resetConfig() {
    configInstance = null;
}
/**
 * Set configuration (for testing)
 */
function setConfig(config) {
    configInstance = config;
}
