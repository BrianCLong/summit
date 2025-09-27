import { PolicyQuotaRule, TenantId } from './types';

interface QuotaUsage {
  limit: number;
  used: number;
}

export class TenantQuotaManager {
  private usage: Map<TenantId, Map<string, QuotaUsage>> = new Map();

  public registerLimit(tenantId: TenantId, toolName: string, rule: PolicyQuotaRule) {
    if (!this.usage.has(tenantId)) {
      this.usage.set(tenantId, new Map());
    }
    const tenantUsage = this.usage.get(tenantId)!;
    const existing = tenantUsage.get(toolName);
    if (!existing || existing.limit !== rule.limit) {
      tenantUsage.set(toolName, { limit: rule.limit, used: existing?.used ?? 0 });
    }
  }

  public checkAndConsume(tenantId: TenantId, toolName: string, limit: number): boolean {
    if (!this.usage.has(tenantId)) {
      this.usage.set(tenantId, new Map());
    }
    const tenantUsage = this.usage.get(tenantId)!;
    let usage = tenantUsage.get(toolName);
    if (!usage) {
      usage = { limit, used: 0 };
      tenantUsage.set(toolName, usage);
    } else if (usage.limit !== limit) {
      usage.limit = limit;
    }

    if (usage.used >= usage.limit) {
      return false;
    }

    usage.used += 1;
    return true;
  }

  public getUsage(tenantId: TenantId, toolName: string): Readonly<QuotaUsage> | undefined {
    return this.usage.get(tenantId)?.get(toolName);
  }

  public reset(tenantId?: TenantId) {
    if (tenantId) {
      this.usage.delete(tenantId);
      return;
    }
    this.usage.clear();
  }
}
