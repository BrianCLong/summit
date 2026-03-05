/**
 * Configuration matrix determining allowable intents based on capability profiles.
 * 'civilian_safe' represents standard enterprise deployments.
 * 'defense_restricted' represents authorized government/defense deployments with bounded military use.
 * 'research_unrestricted' represents specific, auditable R&D environments.
 */

export type CapabilityProfile = 'civilian_safe' | 'defense_restricted' | 'research_unrestricted';

export const ALLOWED_USE_MATRIX: Record<CapabilityProfile, readonly string[]> = {
  civilian_safe: [
    'general_assistance',
    'data_analysis',
    'code_generation',
    'customer_support',
  ],
  defense_restricted: [
    'general_assistance',
    'data_analysis',
    'code_generation',
    'strategic_planning',
    'intelligence_analysis',
    'defensive_cyber_operations',
    // Note: autonomous_targeting and kinetic_action are blocked at the vendor redline level
  ],
  research_unrestricted: [
    'general_assistance',
    'data_analysis',
    'code_generation',
    'strategic_planning',
    'intelligence_analysis',
    'defensive_cyber_operations',
    'vulnerability_research',
    'adversarial_simulation',
  ],
};

/**
 * Checks if a specific intent is allowed under a given profile, IGNORING vendor redlines.
 * A full check requires BOTH this matrix AND the vendor redlines check.
 */
export function isIntentAllowedForProfile(intent: string, profile: CapabilityProfile): boolean {
  const allowedIntents = ALLOWED_USE_MATRIX[profile] || [];
  return allowedIntents.includes(intent);
}
