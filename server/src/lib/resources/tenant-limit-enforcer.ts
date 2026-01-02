// @ts-nocheck
import { createHash } from 'crypto';
import { getRedisClient } from '../../config/database.js';
import { provenanceLedger } from '../../provenance/ledger.js';
import logger from '../../utils/logger.js';
import QuotaManager from './quota-manager.js';
import { TenantContext } from '../../tenancy/types.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type SeatCheckResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

export class TenantLimitEnforcer {
  /**
   * Track active seats for a tenant and enforce the seat cap derived from quota tier.
   * Uses Redis sets keyed by day to avoid unbounded growth; falls back to allow when Redis is unavailable.
   */
  async enforceSeatCap(
    context: TenantContext,
    actorId?: string,
  ): Promise<SeatCheckResult> {
    const quota = QuotaManager.getQuotaForTenant(context.tenantId);
    const redis = getRedisClient();

    if (!redis) {
      logger.warn(
        { tenantId: context.tenantId },
        'Redis unavailable for seat cap enforcement; allowing request',
      );
      return { allowed: true, remaining: quota.seatCap, limit: quota.seatCap };
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const key = `tenant:seats:${context.tenantId}:${dayKey}`;
    const actorKey = actorId || context.subject || 'anonymous';

    await redis.sadd(key, actorKey);
    await redis.pexpire(key, ONE_DAY_MS);

    const seatCount = await redis.scard(key);
    const allowed = seatCount <= quota.seatCap;
    const remaining = Math.max(quota.seatCap - seatCount, 0);

    if (!allowed) {
      await this.recordLimitEvent(context, 'TENANT_SEAT_CAP_EXCEEDED', {
        seatCount,
        seatCap: quota.seatCap,
        actorKey,
      });
    }

    return { allowed, remaining, limit: quota.seatCap };
  }

  /**
   * Enforce a soft storage budget counter using Redis. Designed for services that only
   * have an estimated byte size (e.g., ingestion). Returns the new projected total.
   */
  async enforceStorageBudget(
    tenantId: string,
    estimatedBytes: number,
    resource: string,
  ): Promise<{ allowed: boolean; projected: number; limit: number }> {
    const quota = QuotaManager.getQuotaForTenant(tenantId);
    const redis = getRedisClient();

    if (!redis) {
      logger.warn(
        { tenantId, resource },
        'Redis unavailable for storage budget enforcement; allowing request',
      );
      return {
        allowed: true,
        projected: estimatedBytes,
        limit: quota.storageLimitBytes,
      };
    }

    const key = `tenant:storage:${tenantId}:${new Date().toISOString().slice(0, 10)}`;
    const projected = await redis.incrby(key, estimatedBytes);
    await redis.pexpire(key, ONE_DAY_MS);

    const allowed = projected <= quota.storageLimitBytes;
    if (!allowed) {
      await this.recordLimitEvent(
        { tenantId, environment: 'prod', privilegeTier: 'standard' },
        'TENANT_STORAGE_BUDGET_EXCEEDED',
        { projected, limit: quota.storageLimitBytes, resource },
      );
    }

    return { allowed, projected, limit: quota.storageLimitBytes };
  }

  private async recordLimitEvent(
    context: Pick<TenantContext, 'tenantId'> & Partial<TenantContext>,
    action: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await provenanceLedger.appendEntry({
        tenantId: context.tenantId,
        actionType: action,
        resourceType: 'tenant',
        resourceId: context.tenantId,
        actorId: context.userId || 'system',
        actorType: 'system',
        payload: {
          ...payload,
          hash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
        },
        metadata: {
          environment: context.environment,
          privilegeTier: context.privilegeTier,
        },
      });
    } catch (error: any) {
      logger.warn(
        { tenantId: context.tenantId, action, error },
        'Failed to append provenance entry for limit event',
      );
    }
  }
}

export const tenantLimitEnforcer = new TenantLimitEnforcer();
