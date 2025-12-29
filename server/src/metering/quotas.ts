import { TenantUsageDailyRow } from './schema';
import { persistentUsageRepository } from './persistence';
import logger from '../utils/logger';
import { planService } from '../usage/plans';

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
  // New metrics
  llmTokens?: QuotaLimit;
  computeMs?: QuotaLimit;
  apiRequests?: QuotaLimit;
}

export interface TenantQuota {
  tenantId: string;
  config: QuotaConfig;
}

export class QuotaManager {
  // Override specific quotas per tenant if needed
  private overrides = new Map<string, QuotaConfig>();

  async setQuotaOverride(tenantId: string, config: QuotaConfig): Promise<void> {
    this.overrides.set(tenantId, config);
    logger.info({ tenantId, config }, 'Quota override updated for tenant');
  }

  async getEffectiveQuota(tenantId: string): Promise<QuotaConfig> {
    // 1. Check overrides
    if (this.overrides.has(tenantId)) {
        return this.overrides.get(tenantId)!;
    }

    // 2. Fallback to Plan
    const plan = await planService.getPlanForTenant(tenantId);

    // Map Plan limits to QuotaConfig
    return {
        apiRequests: {
            soft: Math.floor(plan.limits.monthlyRequests * 0.8),
            hard: plan.limits.monthlyRequests
        },
        computeMs: {
            soft: Math.floor(plan.limits.monthlyComputeMs * 0.8),
            hard: plan.limits.monthlyComputeMs
        },
        llmTokens: {
            soft: Math.floor(plan.limits.monthlyLlmTokens * 0.8),
            hard: plan.limits.monthlyLlmTokens
        },
        artifactStoredBytes: {
            soft: Math.floor(plan.limits.maxStorageBytes * 0.9),
            hard: plan.limits.maxStorageBytes
        }
    };
  }

  // Check if a tenant has exceeded a specific quota
  async checkQuota(
    tenantId: string,
    metric: keyof QuotaConfig,
    additionalAmount: number = 0
  ): Promise<{ allowed: boolean; softExceeded: boolean; message?: string }> {
    const quota = await this.getEffectiveQuota(tenantId);
    const limit = quota[metric];

    if (!limit) {
      // If no limit defined for metric, allow
      return { allowed: true, softExceeded: false };
    }

    const today = new Date().toISOString().slice(0, 10);
    // Note: This checks DAILY usage against MONTHLY limits for simplicity in MVP.
    // Ideally we sum up MTD (Month-To-Date).
    // Since we only have daily rollup, we should sum all days in current month.
    // For this MVP, let's just get today's usage and assume the limit is Daily (or we fetch range).

    const startOfMonth = today.slice(0, 7) + '-01';
    const rows = await persistentUsageRepository.list(tenantId, startOfMonth, today);

    // Sum usage
    let currentUsage = 0;
    for (const row of rows) {
        switch (metric) {
          case 'queryExecuted':
            currentUsage += row.queryExecuted || 0;
            break;
          case 'ingestItem':
            currentUsage += row.ingestItem || 0;
            break;
          case 'exportBuilt':
            currentUsage += row.exportBuilt || 0;
            break;
          case 'artifactStoredBytes':
            // For storage, we usually take the max or latest, not sum over time.
            // Using latest from today's row (or latest available)
             if (row.date === today) {
                 currentUsage = Math.max(currentUsage, row.artifactStoredBytes || 0);
             }
            break;
          case 'webhookDelivered':
            currentUsage += row.webhookDelivered || 0;
            break;
          case 'llmTokens':
            currentUsage += row.llmTokens || 0;
            break;
          case 'computeMs':
            currentUsage += row.computeMs || 0;
            break;
          case 'apiRequests':
            currentUsage += row.apiRequests || 0;
            break;
        }
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
