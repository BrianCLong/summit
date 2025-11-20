/**
 * Service Configuration
 * Centralized configuration management for the governance service
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Server Configuration
  port: number;
  host: string;
  nodeEnv: string;

  // Database Configuration
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };

  // Security Configuration
  security: {
    corsOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    enableHelmet: boolean;
  };

  // Logging Configuration
  logging: {
    level: string;
    format: string;
  };

  // API Configuration
  api: {
    basePath: string;
    version: string;
    docsEnabled: boolean;
  };

  // Feature Flags
  features: {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableAuditLog: boolean;
  };
}

/**
 * Get configuration value with default fallback
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  return value ? value.split(',').map(v => v.trim()) : defaultValue;
}

/**
 * Application configuration object
 */
export const config: Config = {
  // Server Configuration
  port: getEnvNumber('PORT', 3030),
  host: getEnv('HOST', '0.0.0.0'),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Database Configuration
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    database: getEnv('DB_NAME', 'governance'),
    user: getEnv('DB_USER', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    maxConnections: getEnvNumber('DB_MAX_CONNECTIONS', 20),
    idleTimeout: getEnvNumber('DB_IDLE_TIMEOUT', 30000),
    connectionTimeout: getEnvNumber('DB_CONNECTION_TIMEOUT', 10000),
  },

  // Security Configuration
  security: {
    corsOrigins: getEnvArray('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:3001']),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    enableHelmet: getEnvBoolean('ENABLE_HELMET', true),
  },

  // Logging Configuration
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    format: getEnv('LOG_FORMAT', 'json'),
  },

  // API Configuration
  api: {
    basePath: getEnv('API_BASE_PATH', '/api/v1'),
    version: getEnv('API_VERSION', '1.0.0'),
    docsEnabled: getEnvBoolean('API_DOCS_ENABLED', true),
  },

  // Feature Flags
  features: {
    enableMetrics: getEnvBoolean('ENABLE_METRICS', true),
    enableTracing: getEnvBoolean('ENABLE_TRACING', false),
    enableAuditLog: getEnvBoolean('ENABLE_AUDIT_LOG', true),
  },
};

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get database connection pool configuration
 */
export function getDatabaseConfig() {
  return {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    max: config.database.maxConnections,
    idleTimeoutMillis: config.database.idleTimeout,
    connectionTimeoutMillis: config.database.connectionTimeout,
  };
}

export default config;
