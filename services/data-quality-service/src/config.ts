/**
 * Service Configuration
 *
 * Centralized configuration management with environment variable support
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

// Configuration schema for validation
const configSchema = z.object({
  // Server configuration
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database configuration
  database: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    database: z.string().default('summit'),
    user: z.string().default('postgres'),
    password: z.string().default('postgres'),
    max: z.coerce.number().default(20),
    idleTimeoutMillis: z.coerce.number().default(30000),
    connectionTimeoutMillis: z.coerce.number().default(2000),
  }),

  // API configuration
  api: z.object({
    prefix: z.string().default('/api/v1'),
    rateLimit: z.object({
      windowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
      max: z.coerce.number().default(100), // limit each IP to 100 requests per windowMs
    }),
  }),

  // Logging configuration
  logging: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    prettyPrint: z.coerce.boolean().default(true),
  }),

  // CORS configuration
  cors: z.object({
    origin: z.string().default('*'),
    credentials: z.coerce.boolean().default(true),
  }),

  // Authentication configuration (stub)
  auth: z.object({
    enabled: z.coerce.boolean().default(false),
    jwtSecret: z.string().optional(),
    jwtExpiresIn: z.string().default('24h'),
  }),

  // Data quality specific configuration
  dataQuality: z.object({
    maxBatchSize: z.coerce.number().default(10000),
    profilingTimeout: z.coerce.number().default(300000), // 5 minutes
    validationTimeout: z.coerce.number().default(180000), // 3 minutes
    enableAnomalyDetection: z.coerce.boolean().default(true),
    enableAutoRemediation: z.coerce.boolean().default(false),
  }),

  // Swagger/OpenAPI configuration
  swagger: z.object({
    enabled: z.coerce.boolean().default(true),
    path: z.string().default('/api-docs'),
  }),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration
 */
function loadConfig(): Config {
  const rawConfig = {
    port: process.env.PORT,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,

    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: process.env.DB_POOL_MAX,
      idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT,
      connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT,
    },

    api: {
      prefix: process.env.API_PREFIX,
      rateLimit: {
        windowMs: process.env.RATE_LIMIT_WINDOW_MS,
        max: process.env.RATE_LIMIT_MAX,
      },
    },

    logging: {
      level: process.env.LOG_LEVEL,
      prettyPrint: process.env.LOG_PRETTY_PRINT,
    },

    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: process.env.CORS_CREDENTIALS,
    },

    auth: {
      enabled: process.env.AUTH_ENABLED,
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    },

    dataQuality: {
      maxBatchSize: process.env.DQ_MAX_BATCH_SIZE,
      profilingTimeout: process.env.DQ_PROFILING_TIMEOUT,
      validationTimeout: process.env.DQ_VALIDATION_TIMEOUT,
      enableAnomalyDetection: process.env.DQ_ENABLE_ANOMALY_DETECTION,
      enableAutoRemediation: process.env.DQ_ENABLE_AUTO_REMEDIATION,
    },

    swagger: {
      enabled: process.env.SWAGGER_ENABLED,
      path: process.env.SWAGGER_PATH,
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw new Error('Invalid configuration');
  }
}

// Export singleton config instance
export const config = loadConfig();

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return config.nodeEnv === 'test';
}
