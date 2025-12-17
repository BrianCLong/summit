import { PlanLimits, PlanTier } from './types.js';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';

const logger = pino({ name: 'QuotaConfig' });

export const DEFAULT_PLANS: Record<PlanTier, PlanLimits> = {
  starter: {
    api_rpm: 100,
    ingest_eps: 10,
    egress_gb_day: 1,
  },
  standard: {
    api_rpm: 6000,
    ingest_eps: 1000,
    egress_gb_day: 50,
  },
  premium: {
    api_rpm: 12000,
    ingest_eps: 2000,
    egress_gb_day: 200,
  },
  enterprise: {
    api_rpm: 100000,
    ingest_eps: 10000,
    egress_gb_day: 1000,
  },
};

interface QuotaState {
  tenantPlans: Record<string, PlanTier>;
  tenantOverrides: Record<string, Partial<PlanLimits>>;
  featureAllowlist: Record<string, string[]>;
}

const DEFAULT_STATE: QuotaState = {
  tenantPlans: {
    'demo-tenant': 'starter',
    'acme-corp': 'standard',
    'massive-dynamic': 'premium',
  },
  tenantOverrides: {
    'acme-corp': {
      api_rpm: 8000,
    },
  },
  featureAllowlist: {
    'write_aware_sharding': ['massive-dynamic', 'acme-corp'],
    'entity_resolution_v1': ['massive-dynamic'],
  }
};

class QuotaConfigService {
  private static instance: QuotaConfigService;
  private state: QuotaState = DEFAULT_STATE;
  private readonly storagePath: string;

  private constructor() {
    this.storagePath = path.join(process.cwd(), 'data', 'quota-config.json');
    this.loadConfig();
  }

  public static getInstance(): QuotaConfigService {
    if (!QuotaConfigService.instance) {
      QuotaConfigService.instance = new QuotaConfigService();
    }
    return QuotaConfigService.instance;
  }

  private async loadConfig() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.state = JSON.parse(data);
      logger.info('Loaded quota configuration');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error({ err: error }, 'Failed to load quota config, using defaults');
      } else {
        // First run, save defaults
        await this.saveConfig();
      }
    }
  }

  private async saveConfig() {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error({ err: error }, 'Failed to save quota config');
    }
  }

  public getTenantPlan(tenantId: string): PlanTier {
    return this.state.tenantPlans[tenantId] || 'starter';
  }

  public getTenantOverrides(tenantId: string): Partial<PlanLimits> {
    return this.state.tenantOverrides[tenantId] || {};
  }

  public getFeatureAllowlist(feature: string): string[] {
    return this.state.featureAllowlist[feature] || [];
  }

  // Admin Methods
  public async setTenantPlan(tenantId: string, plan: PlanTier) {
    this.state.tenantPlans[tenantId] = plan;
    await this.saveConfig();
  }

  public async setTenantOverride(tenantId: string, limits: Partial<PlanLimits>) {
    this.state.tenantOverrides[tenantId] = {
      ...this.state.tenantOverrides[tenantId],
      ...limits
    };
    await this.saveConfig();
  }
}

export const quotaConfigService = QuotaConfigService.getInstance();
