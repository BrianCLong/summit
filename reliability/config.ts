/**
 * Configuration for the reliability features.
 * This file centralizes the logic for reading feature flags and other
 * configuration values from environment variables.
 */

/**
 * Checks if the Ops Guard v1 feature is enabled.
 *
 * To enable, set the `FEATURE_OPS_GUARD_V1` environment variable to "true" or "1".
 *
 * @returns {boolean} True if the feature is enabled, false otherwise.
 */
export function isOpsGuardV1Enabled(): boolean {
  const flag = process.env.FEATURE_OPS_GUARD_V1?.toLowerCase();
  return flag === 'true' || flag === '1';
}
