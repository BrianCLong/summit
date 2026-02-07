export const featureFlags = {
  localLmStudio: process.env.FEATURE_LOCAL_LMSTUDIO === '1',
};

export function resolveProviderName(): 'local-lmstudio' | 'default' {
  return featureFlags.localLmStudio ? 'local-lmstudio' : 'default';
}
