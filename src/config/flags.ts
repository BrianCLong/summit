/**
 * INFOWAR Feature Flags.
 */

export const FEATURE_NARRATIVE_ECOSYSTEM = process.env.FEATURE_NARRATIVE_ECOSYSTEM === 'true';

export function isFeatureEnabled(flag: string): boolean {
  if (flag === 'FEATURE_NARRATIVE_ECOSYSTEM') {
    return FEATURE_NARRATIVE_ECOSYSTEM;
  }
  return false;
}
