/**
 * Feature flag for UI Automation.
 * Defaults to false for safety.
 */
export const FEATURE_UI_AUTOMATION = process.env.FEATURE_UI_AUTOMATION === 'true' || false;

export const DEFAULT_TIMEOUT_MS = 30000;
