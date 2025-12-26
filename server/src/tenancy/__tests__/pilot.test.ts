import { PilotConfigurationManager } from '../../config/pilot-config';
import { PilotConfig } from '../pilot';

describe('PilotConfigurationManager', () => {
  let manager: PilotConfigurationManager;
  const tenantId = 'test-tenant-123';

  beforeEach(() => {
    // Reset instance logic if possible, or just re-get
    manager = PilotConfigurationManager.getInstance();
    // Manually clear the map for testing since it's a private singleton (hack for test)
    // Note: accessing private property for test reset
    if ((manager as any).pilotConfigs) {
         (manager as any).pilotConfigs = {};
    }
  });

  it('should return undefined for unknown tenant', () => {
    expect(manager.getPilotConfig('unknown-id')).toBeUndefined();
  });

  it('should enroll a tenant', () => {
    manager.enrollTenantInPilot(tenantId, 'alpha');
    const config = manager.getPilotConfig(tenantId);
    expect(config).toBeDefined();
    expect(config?.active).toBe(true);
    expect(config?.cohort).toBe('alpha');
  });

  it('should check if feature is enabled', () => {
    manager.enrollTenantInPilot(tenantId, 'alpha');
    manager.setPilotConfig(tenantId, {
        ...manager.getPilotConfig(tenantId)!,
        enabledFeatures: ['new-graph-vis']
    });

    expect(manager.isPilotFeatureEnabled(tenantId, 'new-graph-vis')).toBe(true);
    expect(manager.isPilotFeatureEnabled(tenantId, 'other-feature')).toBe(false);
  });
});
