type RuntimeFeatureFlags = {
  evidenceTrailPeek?: boolean;
};

const getRuntimeFlags = () =>
  (globalThis as typeof globalThis & { __SUMMIT_FEATURE_FLAGS__?: RuntimeFeatureFlags })
    .__SUMMIT_FEATURE_FLAGS__;

const getEnvFlag = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] === 'true';
  }
  return false;
};

export const features = {
  evidenceTrailPeek: getRuntimeFlags()?.evidenceTrailPeek ?? getEnvFlag('VITE_FEATURE_EVIDENCE_TRAIL_PEEK'),
} as const;
