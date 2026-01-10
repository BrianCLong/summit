export const FeatureFlags = {
  FEATURE_INVESTIGATION_UI: 'FEATURE_INVESTIGATION_UI',
  FEATURE_TIMELINE_UI: 'FEATURE_TIMELINE_UI',
  FEATURE_REPORT_DOWNLOAD: 'FEATURE_REPORT_DOWNLOAD',
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

export type FeatureFlagConfig = {
  [K in FeatureFlagKey]: boolean;
};
