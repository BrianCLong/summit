"use strict";
/**
 * Service configuration loader
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.loadConfig = loadConfig;
function getEnvString(key, defaultValue) {
    return process.env[key] || defaultValue;
}
function getEnvInt(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
function getEnvFloat(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}
function getEnvBool(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}
function getEnvArray(key, defaultValue) {
    const value = process.env[key];
    if (!value)
        return defaultValue;
    return value.split(',').map(s => s.trim()).filter(Boolean);
}
function loadConfig() {
    return {
        server: {
            port: getEnvInt('PORT', 3020),
            corsOrigins: getEnvArray('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:4000']),
            rateLimitWindowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
            rateLimitMaxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 1000),
        },
        database: {
            postgres: {
                host: getEnvString('POSTGRES_HOST', 'localhost'),
                port: getEnvInt('POSTGRES_PORT', 5432),
                database: getEnvString('POSTGRES_DB', 'intelgraph'),
                user: getEnvString('POSTGRES_USER', 'intelgraph'),
                password: getEnvString('POSTGRES_PASSWORD', ''),
                maxConnections: getEnvInt('POSTGRES_MAX_CONNECTIONS', 20),
                idleTimeoutMs: getEnvInt('POSTGRES_IDLE_TIMEOUT_MS', 30000),
            },
            neo4j: {
                uri: getEnvString('NEO4J_URI', 'bolt://localhost:7687'),
                username: getEnvString('NEO4J_USERNAME', 'neo4j'),
                password: getEnvString('NEO4J_PASSWORD', ''),
            },
            redis: {
                host: getEnvString('REDIS_HOST', 'localhost'),
                port: getEnvInt('REDIS_PORT', 6379),
                password: process.env.REDIS_PASSWORD || undefined,
                db: getEnvInt('REDIS_DB', 0),
            },
        },
        privacy: {
            defaultMinCohortSize: getEnvInt('DEFAULT_MIN_COHORT_SIZE', 5),
            defaultEpsilon: getEnvFloat('DEFAULT_EPSILON', 1.0),
            defaultMaxQueriesPerHour: getEnvInt('DEFAULT_MAX_QUERIES_PER_HOUR', 100),
            enableDifferentialPrivacy: getEnvBool('ENABLE_DIFFERENTIAL_PRIVACY', true),
            enableKAnonymity: getEnvBool('ENABLE_K_ANONYMITY', true),
        },
        governance: {
            serviceUrl: getEnvString('GOVERNANCE_SERVICE_URL', 'http://localhost:3015'),
            opaEndpoint: getEnvString('OPA_ENDPOINT', 'http://localhost:8181'),
        },
        observability: {
            enableMetrics: getEnvBool('ENABLE_METRICS', true),
            enableTracing: getEnvBool('ENABLE_TRACING', false),
            serviceName: getEnvString('OTEL_SERVICE_NAME', 'privacy-analytics-service'),
            serviceVersion: getEnvString('OTEL_SERVICE_VERSION', '1.0.0'),
        },
    };
}
exports.config = loadConfig();
