// server/src/lib/resources/quota-manager.ts

/**
 * @file Manages hierarchical resource quotas for tenants.
 * @author Jules
 * @version 1.0.0
 *
 * @warning This implementation uses a non-persistent in-memory store.
 * All quota and usage data will be lost on application restart.
 * This is a prototype and is NOT suitable for production use without
 * being refactored to use a persistent data store (e.g., Redis).
 */

// A simple in-memory key-value store to simulate a persistent data store.
const store: { [key: string]: any } = {};

export type ResourceType = 'api_calls' | 'storage' | 'compute' | 'bandwidth';

export interface Quota {
  hardLimit: number;
  softLimit: number;
  usage: number;
}

export type QuotaMap = { [key in ResourceType]?: Quota };

export interface HierarchicalQuota {
  org: QuotaMap;
  team?: { [key: string]: QuotaMap };
  user?: { [key: string]: QuotaMap };
}

export class QuotaManager {
  public getTenantQuotas(tenantId: string): HierarchicalQuota | undefined {
    return store[tenantId];
  }

  public updateTenantQuotas(tenantId: string, newQuotas: HierarchicalQuota): void {
    store[tenantId] = newQuotas;
  }

  public checkQuota(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string }
  ): { allowed: boolean; softLimitExceeded: boolean } {
    const tenantQuotas = this.getTenantQuotas(tenantId);
    if (!tenantQuotas) {
      return { allowed: true, softLimitExceeded: false };
    }

    const { teamId, userId } = identifiers;

    // Check org quota
    const orgQuota = tenantQuotas.org[resource];
    if (orgQuota && orgQuota.usage + amount > orgQuota.hardLimit) {
      return { allowed: false, softLimitExceeded: orgQuota.usage > orgQuota.softLimit };
    }

    // Check team quota
    if (teamId && tenantQuotas.team?.[teamId]?.[resource]) {
      const teamQuota = tenantQuotas.team[teamId][resource]!;
      if (teamQuota.usage + amount > teamQuota.hardLimit) {
        return { allowed: false, softLimitExceeded: teamQuota.usage > teamQuota.softLimit };
      }
    }

    // Check user quota
    if (userId && tenantQuotas.user?.[userId]?.[resource]) {
      const userQuota = tenantQuotas.user[userId][resource]!;
      if (userQuota.usage + amount > userQuota.hardLimit) {
        return { allowed: false, softLimitExceeded: userQuota.usage > userQuota.softLimit };
      }
    }

    let softLimitExceeded = false;
    if (orgQuota && orgQuota.usage + amount > orgQuota.softLimit) {
      softLimitExceeded = true;
    }
    if (teamId && tenantQuotas.team?.[teamId]?.[resource]) {
      const teamQuota = tenantQuotas.team[teamId][resource]!;
      if (teamQuota.usage + amount > teamQuota.softLimit) {
        softLimitExceeded = true;
      }
    }
    if (userId && tenantQuotas.user?.[userId]?.[resource]) {
      const userQuota = tenantQuotas.user[userId][resource]!;
      if (userQuota.usage + amount > userQuota.softLimit) {
        softLimitExceeded = true;
      }
    }

    return {
      allowed: true,
      softLimitExceeded
    };
  }

  public consumeQuota(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string }
  ): boolean {
    const { allowed } = this.checkQuota(tenantId, resource, amount, identifiers);
    if (!allowed) {
      return false;
    }

    const tenantQuotas = this.getTenantQuotas(tenantId);
    if (!tenantQuotas) return false;

    const { teamId, userId } = identifiers;

    if (tenantQuotas.org[resource]) {
        tenantQuotas.org[resource]!.usage += amount;
    }
    if (teamId && tenantQuotas.team?.[teamId]?.[resource]) {
        tenantQuotas.team[teamId][resource]!.usage += amount;
    }
    if (userId && tenantQuotas.user?.[userId]?.[resource]) {
        tenantQuotas.user[userId][resource]!.usage += amount;
    }

    return true;
  }

  public releaseQuota(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string }
  ): void {
    const tenantQuotas = this.getTenantQuotas(tenantId);
    if (!tenantQuotas) return;

    const { teamId, userId } = identifiers;

    if (tenantQuotas.org[resource]) {
        tenantQuotas.org[resource]!.usage = Math.max(0, tenantQuotas.org[resource]!.usage - amount);
    }
    if (teamId && tenantQuotas.team?.[teamId]?.[resource]) {
        tenantQuotas.team[teamId][resource]!.usage = Math.max(0, tenantQuotas.team[teamId][resource]!.usage - amount);
    }
    if (userId && tenantQuotas.user?.[userId]?.[resource]) {
        tenantQuotas.user[userId][resource]!.usage = Math.max(0, tenantQuotas.user[userId][resource]!.usage - amount);
    }
  }
}

export const quotaManager = new QuotaManager();
