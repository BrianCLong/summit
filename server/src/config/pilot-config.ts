import { PilotConfig } from '../tenancy/pilot';
import { TenantConfig } from '../tenancy/types';

// In-memory store for pilot configurations (simulating a database)
// In a real implementation, this would likely be backed by a DB table or a robust config service.
const pilotConfigs: Record<string, PilotConfig> = {};

export class PilotConfigurationManager {
  private static instance: PilotConfigurationManager;
  // @ts-ignore
  private pilotConfigs: Record<string, PilotConfig> = {};

  private constructor() {}

  public static getInstance(): PilotConfigurationManager {
    if (!PilotConfigurationManager.instance) {
      PilotConfigurationManager.instance = new PilotConfigurationManager();
    }
    return PilotConfigurationManager.instance;
  }

  public getPilotConfig(tenantId: string): PilotConfig | undefined {
    return this.pilotConfigs[tenantId];
  }

  public setPilotConfig(tenantId: string, config: PilotConfig): void {
    this.pilotConfigs[tenantId] = config;
  }

  public isPilotFeatureEnabled(tenantId: string, feature: string): boolean {
    const config = this.getPilotConfig(tenantId);
    if (!config || !config.active) {
      return false;
    }
    return config.enabledFeatures.includes(feature);
  }

  public enrollTenantInPilot(tenantId: string, cohort: PilotConfig['cohort'] = 'design-partner'): void {
      this.setPilotConfig(tenantId, {
          active: true,
          cohort,
          startDate: new Date().toISOString(),
          enabledFeatures: []
      });
  }
}

export const pilotConfigManager = PilotConfigurationManager.getInstance();
