import { randomUUID } from 'crypto';
import {
  AccessKey,
  AuditRecord,
  QuotaProfile,
  Tenant,
  TenantPolicy,
  TenantStatus,
  TenantUsage,
} from './types.js';

const defaultQuota: QuotaProfile = {
  maxEvaluations: 5,
  maxRuntimeMinutes: 240,
  dataLimitMb: 2048,
  maxConcurrency: 2,
};

const defaultPolicy: TenantPolicy = {
  allowPii: false,
  restrictedConnectors: ['unsafe-scraper'],
  sandboxed: true,
};

export class ControlPlane {
  private tenants: Map<string, Tenant> = new Map();

  registerTenant(name: string, email: string, quotaOverride?: Partial<QuotaProfile>): Tenant {
    const existing = Array.from(this.tenants.values()).find(
      (t) => t.name.toLowerCase() === name.toLowerCase() && t.email.toLowerCase() === email.toLowerCase(),
    );

    if (existing) {
      return existing;
    }

    const now = new Date();
    const tenant: Tenant = {
      id: randomUUID(),
      name,
      email,
      status: 'provisioning',
      quota: { ...defaultQuota, ...quotaOverride },
      policy: { ...defaultPolicy },
      usage: this.emptyUsage(),
      keys: [],
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };

    this.tenants.set(tenant.id, tenant);
    this.recordAudit(tenant.id, 'tenant.created');
    tenant.status = 'active';
    tenant.updatedAt = new Date();
    this.recordAudit(tenant.id, 'tenant.activated');
    return tenant;
  }

  issueAccessKey(tenantId: string, ttlMinutes = 120): AccessKey {
    const tenant = this.getActiveTenant(tenantId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const key: AccessKey = {
      key: randomUUID(),
      createdAt: now,
      expiresAt,
    };

    tenant.keys.push(key);
    tenant.updatedAt = new Date();
    this.recordAudit(tenantId, 'access-key.issued', { expiresAt });
    return key;
  }

  enforceQuota(tenantId: string, deltaUsage: Partial<TenantUsage>): void {
    const tenant = this.getActiveTenant(tenantId);
    const projectedEvaluations = tenant.usage.evaluationsRun + (deltaUsage.evaluationsRun ?? 0);
    const projectedRuntime = tenant.usage.runtimeMinutes + (deltaUsage.runtimeMinutes ?? 0);
    const projectedData = tenant.usage.dataScannedMb + (deltaUsage.dataScannedMb ?? 0);

    if (projectedEvaluations > tenant.quota.maxEvaluations) {
      throw new Error('Tenant quota exceeded: max evaluations reached');
    }

    if (projectedRuntime > tenant.quota.maxRuntimeMinutes) {
      throw new Error('Tenant quota exceeded: runtime budget exhausted');
    }

    if (projectedData > tenant.quota.dataLimitMb) {
      throw new Error('Tenant quota exceeded: data scan limit reached');
    }
  }

  recordUsage(tenantId: string, deltaUsage: TenantUsage): TenantUsage {
    const tenant = this.getActiveTenant(tenantId);
    this.enforceQuota(tenantId, deltaUsage);
    tenant.usage.evaluationsRun += deltaUsage.evaluationsRun;
    tenant.usage.runtimeMinutes += deltaUsage.runtimeMinutes;
    tenant.usage.dataScannedMb += deltaUsage.dataScannedMb;
    tenant.usage.lastActivityAt = new Date();
    tenant.updatedAt = new Date();
    this.recordAudit(tenantId, 'tenant.usage.recorded', deltaUsage as unknown as Record<string, unknown>);
    return tenant.usage;
  }

  suspendTenant(tenantId: string, reason: string): Tenant {
    const tenant = this.getActiveTenant(tenantId);
    tenant.status = 'suspended';
    tenant.updatedAt = new Date();
    this.recordAudit(tenantId, 'tenant.suspended', { reason });
    return tenant;
  }

  reinstateTenant(tenantId: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.status = 'active';
    tenant.updatedAt = new Date();
    this.recordAudit(tenantId, 'tenant.reinstated');
    return tenant;
  }

  getTenant(tenantId: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  getActiveTenant(tenantId: string): Tenant {
    const tenant = this.getTenant(tenantId);
    if (tenant.status !== 'active') {
      throw new Error('Tenant is not active');
    }
    return tenant;
  }

  recordAudit(tenantId: string, action: string, details?: Record<string, unknown>): AuditRecord {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found for audit');
    }

    const audit: AuditRecord = {
      id: randomUUID(),
      timestamp: new Date(),
      action,
      details,
    };
    tenant.auditLog.push(audit);
    return audit;
  }

  emptyUsage(): TenantUsage {
    return { evaluationsRun: 0, runtimeMinutes: 0, dataScannedMb: 0 };
  }
}
