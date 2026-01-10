import { advancedAuditSystem } from '../audit/index.js';
import logger from '../utils/logger.js';

interface FlagEntry {
  value: boolean | string | number;
  updatedAt: number;
}

export class FlagService {
  private static instance: FlagService;
  private cache: Map<string, FlagEntry> = new Map();

  private constructor() {}

  public static getInstance(): FlagService {
    if (!FlagService.instance) {
      FlagService.instance = new FlagService();
    }
    return FlagService.instance;
  }

  /**
   * Gets the current value of a feature flag/kill switch.
   * Priority:
   * 1. In-memory override (set via API)
   * 2. Environment variable (FLAG_NAME)
   * 3. Default false
   */
  public getFlag(name: string): boolean | string | number {
    const cached = this.cache.get(name);
    if (cached) {
      return cached.value;
    }

    // Fallback to env
    const envKey = `FLAG_${name.toUpperCase()}`;
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
      if (envValue.toLowerCase() === 'true') return true;
      if (envValue.toLowerCase() === 'false') return false;
      const num = Number(envValue);
      if (!isNaN(num)) return num;
      return envValue;
    }

    return false;
  }

  /**
   * Sets an in-memory override for a flag.
   * "Break glass" mechanism - takes effect immediately.
   */
  public async setFlag(name: string, value: boolean | string | number, userId: string = 'system', tenantId: string = 'system'): Promise<void> {
    this.cache.set(name, {
      value,
      updatedAt: Date.now()
    });

    logger.warn({ name, value, userId }, 'Flag override set (Kill Switch / Break Glass)');

    try {
        await advancedAuditSystem.recordEvent({
            eventType: 'system_modification',
            action: 'update_flag',
            outcome: 'success',
            userId: userId,
            tenantId: tenantId,
            serviceId: 'flag-service',
            resourceType: 'feature_flag',
            resourceId: name,
            message: `Flag ${name} set to ${value}`,
            level: 'warn',
            details: { name, value, timestamp: Date.now() },
            complianceRelevant: true,
            complianceFrameworks: ['SOC2'] // Operations change
        });
    } catch (err: any) {
        logger.error({ err }, 'Failed to emit audit event for flag update');
    }
  }

  /**
   * Clears an override, reverting to ENV or default.
   */
  public async clearFlag(name: string, userId: string = 'system', tenantId: string = 'system'): Promise<void> {
      this.cache.delete(name);
      logger.info({ name, userId }, 'Flag override cleared');

      try {
        await advancedAuditSystem.recordEvent({
            eventType: 'system_modification',
            action: 'clear_flag',
            outcome: 'success',
            userId: userId,
            tenantId: tenantId,
            serviceId: 'flag-service',
            resourceType: 'feature_flag',
            resourceId: name,
            message: `Flag ${name} override cleared`,
            level: 'info',
            details: { name, timestamp: Date.now() },
            complianceRelevant: true,
            complianceFrameworks: ['SOC2']
        });
    } catch (err: any) {
        logger.error({ err }, 'Failed to emit audit event for flag clear');
    }
  }
}

export const flagService = FlagService.getInstance();
