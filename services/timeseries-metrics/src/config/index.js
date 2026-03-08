"use strict";
/**
 * Configuration Module
 *
 * Environment-based configuration for the Time-Series Metrics Platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.loadConfig = loadConfig;
const zod_1 = require("zod");
// ============================================================================
// CONFIGURATION SCHEMA
// ============================================================================
const ConfigSchema = zod_1.z.object({
    // Server configuration
    server: zod_1.z.object({
        port: zod_1.z.number().int().positive().default(8090),
        host: zod_1.z.string().default('0.0.0.0'),
    }),
    // Database configuration
    database: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.number().int().positive().default(5432),
        database: zod_1.z.string().default('timeseries_metrics'),
        user: zod_1.z.string().default('postgres'),
        password: zod_1.z.string().default('postgres'),
        maxConnections: zod_1.z.number().int().positive().default(20),
        idleTimeoutMs: zod_1.z.number().int().positive().default(30000),
        ssl: zod_1.z.boolean().default(false),
    }),
    // Redis configuration
    redis: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.number().int().positive().default(6379),
        password: zod_1.z.string().optional(),
        db: zod_1.z.number().int().min(0).default(0),
    }),
    // Kafka configuration
    kafka: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        brokers: zod_1.z.array(zod_1.z.string()).default(['localhost:9092']),
        clientId: zod_1.z.string().default('timeseries-metrics'),
        topic: zod_1.z.string().default('metrics-ingest'),
    }),
    // Ingestion configuration
    ingestion: zod_1.z.object({
        batchSize: zod_1.z.number().int().positive().default(1000),
        batchTimeoutMs: zod_1.z.number().int().positive().default(5000),
        maxClockSkewMs: zod_1.z.number().int().positive().default(300000),
        futureTolerance: zod_1.z.number().int().positive().default(60000),
        pastTolerance: zod_1.z.number().int().positive().default(604800000), // 7 days
    }),
    // Query configuration
    query: zod_1.z.object({
        defaultTimeout: zod_1.z.number().int().positive().default(30000),
        maxTimeout: zod_1.z.number().int().positive().default(300000),
        cacheEnabled: zod_1.z.boolean().default(true),
        cacheTtlMs: zod_1.z.number().int().positive().default(60000),
        maxConcurrentQueries: zod_1.z.number().int().positive().default(100),
    }),
    // Storage configuration
    storage: zod_1.z.object({
        hotRetention: zod_1.z.string().default('7d'),
        warmRetention: zod_1.z.string().default('30d'),
        coldRetention: zod_1.z.string().default('365d'),
        downsamplingEnabled: zod_1.z.boolean().default(true),
        downsamplingInterval: zod_1.z.string().default('1h'),
        compressionEnabled: zod_1.z.boolean().default(true),
    }),
    // Logging configuration
    logging: zod_1.z.object({
        level: zod_1.z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
        format: zod_1.z.enum(['json', 'pretty']).default('json'),
    }),
    // Feature flags
    features: zod_1.z.object({
        sloCalculation: zod_1.z.boolean().default(true),
        multiTenant: zod_1.z.boolean().default(true),
        queryCache: zod_1.z.boolean().default(true),
        kafkaIngestion: zod_1.z.boolean().default(false),
    }),
});
// ============================================================================
// CONFIGURATION LOADER
// ============================================================================
function getEnvString(key, defaultValue) {
    return process.env[key] || defaultValue;
}
function getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
function getEnvBoolean(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}
function getEnvArray(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value.split(',').map((s) => s.trim());
}
/**
 * Load configuration from environment variables
 */
function loadConfig() {
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
            level: getEnvString('LOG_LEVEL', 'info'),
            format: getEnvString('LOG_FORMAT', 'json'),
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
exports.defaultConfig = loadConfig();
