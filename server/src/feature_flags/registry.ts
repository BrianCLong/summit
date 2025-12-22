export const FeatureFlags = {
  // Example flags
  NEW_SEARCH_ALGORITHM: 'new_search_algorithm',
  BETA_DASHBOARD: 'beta_dashboard',
  DARK_MODE_DEFAULT: 'dark_mode_default',
  // Add new flags here
} as const;

export type FeatureFlag = (typeof FeatureFlags)[keyof typeof FeatureFlags];

export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  [FeatureFlags.NEW_SEARCH_ALGORITHM]: false,
  [FeatureFlags.BETA_DASHBOARD]: false,
  [FeatureFlags.DARK_MODE_DEFAULT]: false,
};
