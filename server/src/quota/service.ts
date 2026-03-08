import {
  TenantQuotaConfig,
  getAllTenantQuotas,
  getTenantQuota,
  isQuotaEnforcementEnabled,
  resetTenantQuotaCache,
} from './config.js';
import { QuotaStore } from './store.js';

export type QuotaReason =
  | 'storage_exceeded'
  | 'evidence_exceeded'
  | 'export_exceeded'
  | 'jobs_exceeded'
  | 'api_rate_exceeded';

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  reason?: QuotaReason;
  retryAfterMs?: number;
}

const minute = 60 * 1000;

export class QuotaService {
  constructor(private readonly store = new QuotaStore()) {}

  reset(): void {
    resetTenantQuotaCache();
    this.store.reset();
  }

  getConfiguredTenants(): Record<string, TenantQuotaConfig> {
    return getAllTenantQuotas();
  }

  checkStorageBytes(
    tenantId: string,
    bytes: number,
    fingerprint?: string,
  ): QuotaCheckResult {
      if (!this.isEnabled()) {
        return {
          allowed: true,
          limit: Infinity,
          used: 0,
          remaining: Infinity,
        };
      }

    const limits = getTenantQuota(tenantId);
    const used = this.store.incrementDeterministic(
      tenantId,
      'storageBytes',
      bytes,
      fingerprint,
    );
    const remaining = Math.max(0, limits.storageBytes - used);
    const allowed = used <= limits.storageBytes;
    return {
      allowed,
      limit: limits.storageBytes,
      used,
      remaining,
      reason: allowed ? undefined : 'storage_exceeded',
    };
  }

  checkEvidence(
    tenantId: string,
    evidenceId: string,
    footprintBytes?: number,
  ): QuotaCheckResult {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        limit: Infinity,
        used: 0,
        remaining: Infinity,
      };
    }

    const limits = getTenantQuota(tenantId);
    const used = this.store.incrementDeterministic(
      tenantId,
      'evidenceCount',
      1,
      evidenceId,
    );
    let combinedReason: QuotaReason | undefined;
    let allowed = used <= limits.evidenceCount;
    let remaining = Math.max(0, limits.evidenceCount - used);

    if (footprintBytes && allowed) {
      const storageResult = this.checkStorageBytes(tenantId, footprintBytes, evidenceId);
      if (!storageResult.allowed) {
        return storageResult;
      }
      remaining = Math.min(remaining, storageResult.remaining);
    }

    if (!allowed) {
      combinedReason = 'evidence_exceeded';
    }

    return {
      allowed,
      limit: limits.evidenceCount,
      used,
      remaining,
      reason: combinedReason,
    };
  }

  checkExport(tenantId: string, exportId: string): QuotaCheckResult {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        limit: Infinity,
        used: 0,
        remaining: Infinity,
      };
    }

    const limits = getTenantQuota(tenantId);
    const used = this.store.incrementDeterministic(
      tenantId,
      'exportCount',
      1,
      exportId,
    );
    const allowed = used <= limits.exportCount;
    const remaining = Math.max(0, limits.exportCount - used);
    return {
      allowed,
      limit: limits.exportCount,
      used,
      remaining,
      reason: allowed ? undefined : 'export_exceeded',
    };
  }

  checkJobEnqueue(tenantId: string, jobKey?: string): QuotaCheckResult {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        limit: Infinity,
        used: 0,
        remaining: Infinity,
      };
    }

    const limits = getTenantQuota(tenantId);
    const tracker = jobKey ? this.store.getUniqueTracker(tenantId, 'jobConcurrency') : null;
    const currentUsage = this.store.getCounter(tenantId).jobConcurrency;
    if (tracker?.has(jobKey!)) {
      const remaining = Math.max(0, limits.jobConcurrency - currentUsage);
      return {
        allowed: currentUsage <= limits.jobConcurrency,
        limit: limits.jobConcurrency,
        used: currentUsage,
        remaining,
        reason: currentUsage <= limits.jobConcurrency ? undefined : 'jobs_exceeded',
      };
    }

    const projected = currentUsage + 1;
    const allowed = projected <= limits.jobConcurrency;
    if (!allowed) {
      return {
        allowed: false,
        limit: limits.jobConcurrency,
        used: currentUsage,
        remaining: Math.max(0, limits.jobConcurrency - currentUsage),
        reason: 'jobs_exceeded',
      };
    }

    const used = this.store.incrementDeterministic(
      tenantId,
      'jobConcurrency',
      1,
      jobKey,
    );
    const remaining = Math.max(0, limits.jobConcurrency - used);
    return {
      allowed,
      limit: limits.jobConcurrency,
      used,
      remaining,
      reason: allowed ? undefined : 'jobs_exceeded',
    };
  }

  completeJob(tenantId: string, delta = 1): number {
    return this.store.decrementJobConcurrency(tenantId, delta);
  }

  checkApiRequest(tenantId: string): QuotaCheckResult {
    if (!this.isEnabled()) {
      return {
        allowed: true,
        limit: Infinity,
        used: 0,
        remaining: Infinity,
        retryAfterMs: 0,
      };
    }

    const limits = getTenantQuota(tenantId);
    const window = this.store.trackApiRequest(tenantId, minute);
    const allowed = window.count <= limits.apiRatePerMinute;
    const remaining = Math.max(0, limits.apiRatePerMinute - window.count);
    const resetAt = window.windowStart + minute;
    const retryAfterMs = allowed ? 0 : Math.max(0, resetAt - Date.now());

    return {
      allowed,
      limit: limits.apiRatePerMinute,
      used: window.count,
      remaining,
      reason: allowed ? undefined : 'api_rate_exceeded',
      retryAfterMs,
    };
  }

  isEnabled(): boolean {
    return isQuotaEnforcementEnabled();
  }
}

export const quotaService = new QuotaService();
