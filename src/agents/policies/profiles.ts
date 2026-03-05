import { CapabilityProfile } from './allowedUseMatrix';

export interface TenantConfig {
  tenantId: string;
  profileName: CapabilityProfile;
  auditEnabled: boolean;
  canOverrideConstraints: boolean; // Note: Cannot override VENDOR_REDLINES
}

/**
 * Mock database mapping of tenant configurations for demonstration.
 * In production, this would be an active lookup verifying subscription limits and signed contracts.
 */
const tenantConfigs: Record<string, TenantConfig> = {
  'enterprise-corp-xyz': {
    tenantId: 'enterprise-corp-xyz',
    profileName: 'civilian_safe',
    auditEnabled: true,
    canOverrideConstraints: false,
  },
  'dod-authorized-subagency': {
    tenantId: 'dod-authorized-subagency',
    profileName: 'defense_restricted',
    auditEnabled: true,
    canOverrideConstraints: false, // Defense is restricted but never overrides vendor redlines.
  },
  'ai-safety-lab-01': {
    tenantId: 'ai-safety-lab-01',
    profileName: 'research_unrestricted',
    auditEnabled: true,
    canOverrideConstraints: true, // Specific audit requirements may apply, but wide capabilities exist.
  },
};

/**
 * Retrieves the tenant capability profile.
 * Falls back to 'civilian_safe' if the tenant is unknown, ensuring a deny-by-default or restrict-by-default posture.
 */
export function getTenantProfile(tenantId: string): CapabilityProfile {
  const config = tenantConfigs[tenantId];
  if (!config) {
    // Failsafe configuration
    return 'civilian_safe';
  }
  return config.profileName;
}
