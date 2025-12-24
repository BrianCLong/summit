import { TenantUsageDailyRow } from './schema.js';
import { persistentUsageRepository } from './persistence.js';
import logger from '../utils/logger.js';

export interface QuotaLimit {
  soft: number;
  hard: number;
}

export interface QuotaConfig {
  queryExecuted?: QuotaLimit;
  ingestItem?: QuotaLimit;
  exportBuilt?: QuotaLimit;
  artifactStoredBytes?: QuotaLimit;
  webhookDelivered?: QuotaLimit;
}

export interface TenantQuota {
  tenantId: string;
  config: QuotaConfig;
}

export class QuotaManager {
  private quotas = new Map<string, QuotaConfig>();

  async setQuota(tenantId: string, config: QuotaConfig): Promise<void> {
    this.quotas.set(tenantId, config);
    logger.info({ tenantId, config }, 'Quota updated for tenant');
  }

  async getQuota(tenantId: string): Promise<QuotaConfig | undefined> {
    return this.quotas.get(tenantId);
  }

  // Check if a tenant has exceeded a specific quota
  async checkQuota(
    tenantId: string,
    metric: keyof QuotaConfig,
    additionalAmount: number = 0
  ): Promise<{ allowed: boolean; softExceeded: boolean; message?: string }> {
    const quota = this.quotas.get(tenantId);
    if (!quota) {
      return { allowed: true, softExceeded: false };
    }

    const limit = quota[metric];
    if (!limit) {
      return { allowed: true, softExceeded: false };
    }

    const today = new Date().toISOString().slice(0, 10);
    const usageRow = await persistentUsageRepository.get(tenantId, today);

    // Map config keys to usage row keys
    let currentUsage = 0;
    switch (metric) {
      case 'queryExecuted':
        currentUsage = usageRow?.queryExecuted || 0;
        break;
      case 'ingestItem':
        currentUsage = usageRow?.ingestItem || 0;
        break;
      case 'exportBuilt':
        currentUsage = usageRow?.exportBuilt || 0;
        break;
      case 'artifactStoredBytes':
        currentUsage = usageRow?.artifactStoredBytes || 0;
        break;
      case 'webhookDelivered':
        currentUsage = usageRow?.webhookDelivered || 0;
        break;
      default:
        return { allowed: true, softExceeded: false };
    }

    const projectedUsage = currentUsage + additionalAmount;

    if (projectedUsage > limit.hard) {
      return {
        allowed: false,
        softExceeded: true,
        message: `Hard quota exceeded for ${metric}. Limit: ${limit.hard}, Usage: ${projectedUsage}`,
      };
    }

    if (projectedUsage > limit.soft) {
      return {
        allowed: true,
        softExceeded: true,
        message: `Soft quota exceeded for ${metric}. Limit: ${limit.soft}, Usage: ${projectedUsage}`,
      };
    }

    return { allowed: true, softExceeded: false };
  }
}

export const quotaManager = new QuotaManager();
