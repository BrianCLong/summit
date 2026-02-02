export const NDS_FEATURE_FLAGS = {
  NDS_ENABLED: false,
  NDS_AGENTS_ENABLED: false,
  NDS_SIM_ENABLED: false,
} as const;

export type NdsFeatureFlag = keyof typeof NDS_FEATURE_FLAGS;
