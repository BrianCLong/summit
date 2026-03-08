"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_js_1 = require("../server/src/observability/logger.js");
// Load environment variables
dotenv_1.default.config();
function getEnvVar(key, defaultValue) {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function getEnvNumber(key, defaultValue) {
    const value = process.env[key];
    if (!value)
        return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number for environment variable ${key}: ${value}`);
    }
    return parsed;
}
exports.config = {
    // Server
    NODE_ENV: getEnvVar('NODE_ENV', 'development'),
    PORT: getEnvNumber('PORT', 4000),
    APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),
    CORS_ORIGINS: getEnvVar('CORS_ORIGINS', 'http://localhost:3000'),
    // Authentication & Security
    JWT_PUBLIC_KEY: getEnvVar('JWT_PUBLIC_KEY'),
    JWT_ALGORITHM: getEnvVar('JWT_ALGORITHM', 'RS256'),
    JWT_ISSUER: getEnvVar('JWT_ISSUER', 'intelgraph'),
    JWT_AUDIENCE: getEnvVar('JWT_AUDIENCE', 'intelgraph-api'),
    // Neo4j
    NEO4J_URI: getEnvVar('NEO4J_URI', 'bolt://localhost:7687'),
    NEO4J_USER: getEnvVar('NEO4J_USER', 'neo4j'),
    NEO4J_PASSWORD: getEnvVar('NEO4J_PASSWORD'),
    NEO4J_DATABASE: process.env.NEO4J_DATABASE || 'neo4j',
    // PostgreSQL
    POSTGRES_URI: getEnvVar('POSTGRES_URI'),
    POSTGRES_MAX_CONNECTIONS: getEnvNumber('POSTGRES_MAX_CONNECTIONS', 20),
    // Redis
    REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    REDIS_PREFIX: getEnvVar('REDIS_PREFIX', 'v24:coherence:'),
    REDIS_TTL: getEnvNumber('REDIS_TTL', 3600), // 1 hour
    // Kafka (optional)
    KAFKA_ENABLED: getEnvVar('KAFKA_ENABLED', 'false'),
    KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
    KAFKA_TOPIC_COHERENCE: getEnvVar('KAFKA_TOPIC_COHERENCE', 'coherence.signals.v1'),
    KAFKA_GROUP_ID: getEnvVar('KAFKA_GROUP_ID', 'v24-coherence-consumer'),
    // OPA Policy Engine
    OPA_URL: getEnvVar('OPA_URL', 'http://localhost:8181'),
    OPA_ENABLED: getEnvVar('OPA_ENABLED', 'true'),
    // Observability
    METRICS_ENABLED: getEnvVar('METRICS_ENABLED', 'true'),
    OTEL_ENABLED: getEnvVar('OTEL_ENABLED', 'true'),
    OTEL_SERVICE_NAME: getEnvVar('OTEL_SERVICE_NAME', 'v24-coherence-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    PROMETHEUS_PORT: getEnvNumber('PROMETHEUS_PORT', 9090),
    // Rate Limiting & Budget
    CONDUCTOR_RPS_MAX: getEnvNumber('CONDUCTOR_RPS_MAX', 1000),
    CONDUCTOR_BUDGET_DAILY_USD: getEnvNumber('CONDUCTOR_BUDGET_DAILY_USD', 100),
    // LLM Integration
    LLM_LIGHT_URL: process.env.LLM_LIGHT_URL,
    LLM_LIGHT_KEY: process.env.LLM_LIGHT_KEY,
    LLM_HEAVY_URL: process.env.LLM_HEAVY_URL,
    LLM_HEAVY_KEY: process.env.LLM_HEAVY_KEY,
    // Materialization
    MATERIALIZATION_INTERVAL_MS: getEnvNumber('MATERIALIZATION_INTERVAL_MS', 30000), // 30 seconds
    MATERIALIZATION_BATCH_SIZE: getEnvNumber('MATERIALIZATION_BATCH_SIZE', 100),
    // Subscriptions
    SUBSCRIPTION_FANOUT_BATCH_MS: getEnvNumber('SUBSCRIPTION_FANOUT_BATCH_MS', 100),
    SUBSCRIPTION_MAX_CONNECTIONS: getEnvNumber('SUBSCRIPTION_MAX_CONNECTIONS', 1000),
    // PagerDuty
    PAGERDUTY_ROUTING_KEY: process.env.PAGERDUTY_ROUTING_KEY,
};
// Validate critical configuration
if (exports.config.NODE_ENV === 'production') {
    const requiredForProduction = [
        'JWT_PUBLIC_KEY',
        'NEO4J_PASSWORD',
        'POSTGRES_URI',
    ];
    for (const key of requiredForProduction) {
        if (!process.env[key]) {
            logger_js_1.logger.error(`Missing required production environment variable: ${key}`);
            process.exit(1);
        }
    }
}
logger_js_1.logger.info('Configuration loaded', {
    nodeEnv: exports.config.NODE_ENV,
    port: exports.config.PORT,
    neo4jUri: exports.config.NEO4J_URI,
    redisUrl: exports.config.REDIS_URL,
    kafkaEnabled: exports.config.KAFKA_ENABLED,
    opaEnabled: exports.config.OPA_ENABLED,
    metricsEnabled: exports.config.METRICS_ENABLED,
});
