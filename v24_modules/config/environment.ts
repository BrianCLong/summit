import dotenv from 'dotenv';
import { logger } from '../server/src/observability/logger.js';

// Load environment variables
dotenv.config();

export interface Config {
  // Server
  NODE_ENV: string;
  PORT: number;
  APP_VERSION: string;
  CORS_ORIGINS: string;

  // Authentication & Security
  JWT_PUBLIC_KEY: string;
  JWT_ALGORITHM: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;

  // Neo4j
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;
  NEO4J_DATABASE?: string;

  // PostgreSQL
  POSTGRES_URI: string;
  POSTGRES_MAX_CONNECTIONS: number;

  // Redis
  REDIS_URL: string;
  REDIS_PREFIX: string;
  REDIS_TTL: number;

  // Kafka (optional)
  KAFKA_ENABLED: string;
  KAFKA_BROKERS?: string;
  KAFKA_TOPIC_COHERENCE: string;
  KAFKA_GROUP_ID: string;

  // OPA Policy Engine
  OPA_URL: string;
  OPA_ENABLED: string;

  // Observability
  METRICS_ENABLED: string;
  OTEL_ENABLED: string;
  OTEL_SERVICE_NAME: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  PROMETHEUS_PORT: number;

  // Rate Limiting & Budget
  CONDUCTOR_RPS_MAX: number;
  CONDUCTOR_BUDGET_DAILY_USD: number;

  // LLM Integration
  LLM_LIGHT_URL?: string;
  LLM_LIGHT_KEY?: string;
  LLM_HEAVY_URL?: string;
  LLM_HEAVY_KEY?: string;

  // Materialization
  MATERIALIZATION_INTERVAL_MS: number;
  MATERIALIZATION_BATCH_SIZE: number;

  // Subscriptions
  SUBSCRIPTION_FANOUT_BATCH_MS: number;
  SUBSCRIPTION_MAX_CONNECTIONS: number;

  // PagerDuty
  PAGERDUTY_ROUTING_KEY?: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export const config: Config = {
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
  KAFKA_TOPIC_COHERENCE: getEnvVar(
    'KAFKA_TOPIC_COHERENCE',
    'coherence.signals.v1',
  ),
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
  MATERIALIZATION_INTERVAL_MS: getEnvNumber(
    'MATERIALIZATION_INTERVAL_MS',
    30000,
  ), // 30 seconds
  MATERIALIZATION_BATCH_SIZE: getEnvNumber('MATERIALIZATION_BATCH_SIZE', 100),

  // Subscriptions
  SUBSCRIPTION_FANOUT_BATCH_MS: getEnvNumber(
    'SUBSCRIPTION_FANOUT_BATCH_MS',
    100,
  ),
  SUBSCRIPTION_MAX_CONNECTIONS: getEnvNumber(
    'SUBSCRIPTION_MAX_CONNECTIONS',
    1000,
  ),

  // PagerDuty
  PAGERDUTY_ROUTING_KEY: process.env.PAGERDUTY_ROUTING_KEY,
};

// Validate critical configuration
if (config.NODE_ENV === 'production') {
  const requiredForProduction = [
    'JWT_PUBLIC_KEY',
    'NEO4J_PASSWORD',
    'POSTGRES_URI',
  ];

  for (const key of requiredForProduction) {
    if (!process.env[key]) {
      logger.error(`Missing required production environment variable: ${key}`);
      process.exit(1);
    }
  }
}

logger.info('Configuration loaded', {
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  neo4jUri: config.NEO4J_URI,
  redisUrl: config.REDIS_URL,
  kafkaEnabled: config.KAFKA_ENABLED,
  opaEnabled: config.OPA_ENABLED,
  metricsEnabled: config.METRICS_ENABLED,
});
