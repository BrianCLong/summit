
import { cfg } from '../../config.js';

interface RateLimitPolicy {
  rpm: number;
  burst: number;
  windowMs: number;
}

interface TenantConfig {
  [tenantId: string]: RateLimitPolicy;
}

interface QuotaConfig {
  limits: {
    tenant_default: RateLimitPolicy;
    tenant_overrides: TenantConfig;
  };
}

// Hardcoded config for now, matching the plan example
const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  limits: {
    tenant_default: {
      rpm: 6000,
      burst: 1200,
      windowMs: 60000,
    },
    tenant_overrides: {
      TENANT_ALPHA: {
        rpm: 12000,
        burst: 2400,
        windowMs: 60000,
      },
    },
  },
};

export class QuotaManager {
  private config: QuotaConfig;

  constructor(config: QuotaConfig = DEFAULT_QUOTA_CONFIG) {
    this.config = config;
  }

  getRateLimitPolicy(tenantId?: string): RateLimitPolicy {
    if (tenantId && this.config.limits.tenant_overrides[tenantId]) {
      return this.config.limits.tenant_overrides[tenantId];
    }
    return this.config.limits.tenant_default;
  }

  // Helper to convert to the format expected by RateLimiter
  getRateLimitConfig(tenantId?: string) {
    const policy = this.getRateLimitPolicy(tenantId);
    return {
      limit: policy.rpm, // Using RPM as the limit for the window
      windowMs: policy.windowMs,
    };
  }
}

export const quotaManager = new QuotaManager();
