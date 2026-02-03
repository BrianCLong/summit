import { FeatureFlags, FeatureFlagKey, FeatureFlagConfig } from './types';

/**
 * Reads feature flags from environment variables.
 * Supports both Vite (import.meta.env) and Node/Jest (process.env).
 *
 * Defaults to FALSE if not explicitly set to 'true'.
 */
export const getFeatureFlags = (): FeatureFlagConfig => {
  const getVal = (key: string) => {
    const envKey = `VITE_${key}`;

    // Check process.env (Node/Jest/Vite with compatibility plugin)
    try {
      if (typeof process !== 'undefined' && process.env && process.env[envKey] === 'true') {
        return true;
      }
    } catch {
      // ignore
    }

    // Check import.meta.env (Vite standard)
    // This is required for the client application to work in production.
    // Note: This might cause SyntaxError in CJS environments (like Jest) if not transformed.
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[envKey] === 'true') {
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  return {
    FEATURE_INVESTIGATION_UI: getVal('FEATURE_INVESTIGATION_UI'),
    FEATURE_TIMELINE_UI: getVal('FEATURE_TIMELINE_UI'),
    FEATURE_REPORT_DOWNLOAD: getVal('FEATURE_REPORT_DOWNLOAD'),
  };
};

export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  const flags = getFeatureFlags();
  return flags[flag];
};

export { FeatureFlags };
export type { FeatureFlagKey, FeatureFlagConfig };
