
import { getRedisClient } from '../../../config/database.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'QuotaOverrideService' });

export class QuotaOverrideService {
  private static instance: QuotaOverrideService;

  private constructor() {}

  public static getInstance(): QuotaOverrideService {
    if (!QuotaOverrideService.instance) {
      QuotaOverrideService.instance = new QuotaOverrideService();
    }
    return QuotaOverrideService.instance;
  }

  /**
   * Set a temporary override for a tenant's quota.
   * @param tenantId The tenant ID.
   * @param meter The meter to override (e.g. 'requests_day', 'api_rpm').
   * @param ttlSeconds How long the override should last.
   * @param reason Why the override was granted.
   */
  public async setOverride(tenantId: string, meter: string, ttlSeconds: number, reason: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) throw new Error('Redis unavailable');

    const key = `tenant:${tenantId}:override:${meter}`;
    await redis.set(key, 'true', 'EX', ttlSeconds);

    logger.info({ tenantId, meter, ttlSeconds, reason }, 'Quota override set');
  }

  /**
   * Check if a valid override exists for a tenant's meter.
   */
  public async hasOverride(tenantId: string, meter: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return false;

    const key = `tenant:${tenantId}:override:${meter}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Remove an override manually.
   */
  public async removeOverride(tenantId: string, meter: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const key = `tenant:${tenantId}:override:${meter}`;
    await redis.del(key);
    logger.info({ tenantId, meter }, 'Quota override removed');
  }
}

export const quotaOverrideService = QuotaOverrideService.getInstance();
