import { Tenant, TenantConfig } from './types.js';
import { TenantStore } from './tenantStore.js';
import NodeCache from 'node-cache';
import crypto from 'node:crypto';

export class TenantService {
  private store: TenantStore;
  private cache: NodeCache;

  constructor() {
    this.store = new TenantStore();
    // Cache for 1 minute, delete checks every 2 minutes
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
  }

  async getTenant(id: string): Promise<Tenant | null> {
    const cached = this.cache.get<Tenant>(id);
    if (cached) {
      return cached;
    }

    const tenant = await this.store.getTenantById(id);
    if (tenant) {
      this.cache.set(id, tenant);
    }
    return tenant;
  }

  async createTenant(
    name: string,
    tier: Tenant['tier'] = 'free',
    config: Partial<TenantConfig> = {}
  ): Promise<Tenant> {
    const id = crypto.randomUUID();
    const newTenant: Omit<Tenant, 'createdAt' | 'updatedAt'> = {
      id,
      name,
      status: 'active',
      tier,
      config: {
        features: config.features || {},
        limits: config.limits || {
          maxUsers: 5,
          maxStorageBytes: 1024 * 1024 * 100, // 100MB
          maxApiRequestsPerMinute: 60,
        },
        branding: config.branding,
        settings: config.settings,
      },
    };

    const created = await this.store.createTenant(newTenant);
    this.cache.set(id, created);
    return created;
  }

  async updateTenantConfig(id: string, configUpdates: Partial<TenantConfig>): Promise<Tenant | null> {
      const tenant = await this.getTenant(id);
      if (!tenant) return null;

      const newConfig = {
          ...tenant.config,
          ...configUpdates,
          features: { ...tenant.config.features, ...configUpdates.features },
          limits: { ...tenant.config.limits, ...configUpdates.limits },
      };

      const updated = await this.store.updateTenant(id, { config: newConfig });
      if (updated) {
          this.cache.set(id, updated);
      }
      return updated;
  }

  async suspendTenant(id: string): Promise<Tenant | null> {
      const updated = await this.store.updateTenant(id, { status: 'suspended' });
      if (updated) {
          this.cache.set(id, updated);
      }
      return updated;
  }
}

export const tenantService = new TenantService();
