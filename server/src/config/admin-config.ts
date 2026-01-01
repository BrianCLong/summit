
import { z } from 'zod';
import { logger } from '../utils/logger.js';

export const AdminConfigSchema = z.object({
  PG_WRITE_POOL_SIZE: z.coerce.number().min(5).max(100).default(24),
  PG_READ_POOL_SIZE: z.coerce.number().min(5).max(100).default(60),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  CORS_ORIGIN: z.string().default('*'), // Validation usually happens in middleware
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(10).default(100),
  NODE_ENV: z.enum(['development', 'test', 'production', 'staging']).default('development'),
});

export type AdminConfig = z.infer<typeof AdminConfigSchema>;

export class AdminConfigManager {
  private static instance: AdminConfigManager;
  private config: AdminConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AdminConfigManager {
    if (!AdminConfigManager.instance) {
      AdminConfigManager.instance = new AdminConfigManager();
    }
    return AdminConfigManager.instance;
  }

  private loadConfig(): AdminConfig {
    const rawConfig = {
      PG_WRITE_POOL_SIZE: process.env.PG_WRITE_POOL_SIZE,
      PG_READ_POOL_SIZE: process.env.PG_READ_POOL_SIZE,
      LOG_LEVEL: process.env.LOG_LEVEL,
      JWT_SECRET: process.env.JWT_SECRET,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
      NODE_ENV: process.env.NODE_ENV,
    };

    const result = AdminConfigSchema.safeParse(rawConfig);

    if (!result.success) {
      const errorMsg = `Invalid Admin Configuration: ${JSON.stringify(result.error.format())}`;
      if (process.env.NODE_ENV === 'production') {
        logger.error(errorMsg);
        // We throw in production to fail fast on bad config
        throw new Error(errorMsg);
      } else {
        logger.warn(`${errorMsg} - Proceeding with unsafe config in non-prod`);
        // Fallback or partial load could happen here, but for now we just log
        // For development, we might mock JWT_SECRET if missing to avoid startup crash
        if (!process.env.JWT_SECRET) {
             logger.warn("JWT_SECRET missing, using dev default");
             // Note: In real app we might not want to mutate process.env, but for this config object we can return defaults
             // But zod already failed. We need to handle this gracefully.
        }
      }
    }

    // If validation failed but we are not in prod, we might want to return a default/fallback object
    // Or just re-parse with some defaults injected if possible.
    // For this implementation, let's assume valid config or fail, but relax JWT check in dev.

    // Re-attempt with dev defaults if failed and not prod
    if (!result.success && process.env.NODE_ENV !== 'production') {
        const devConfig = {
            ...rawConfig,
            JWT_SECRET: rawConfig.JWT_SECRET || 'dev-secret-at-least-32-chars-long-xxxxxxxx',
            PG_WRITE_POOL_SIZE: rawConfig.PG_WRITE_POOL_SIZE || 10,
            PG_READ_POOL_SIZE: rawConfig.PG_READ_POOL_SIZE || 10,
        };
        return AdminConfigSchema.parse(devConfig);
    }

    if (!result.success) throw new Error(`Invalid Admin Configuration: ${result.error.message}`);
    return result.data;
  }

  getConfig(): AdminConfig {
    return this.config;
  }
}

export const adminConfig = AdminConfigManager.getInstance().getConfig();
