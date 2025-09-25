export interface FeatureToggles {
  observability: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

export const features: FeatureToggles = {
  observability: parseBoolean(process.env.FEATURES_OBSERVABILITY, true),
};

export function isFeatureEnabled(feature: keyof FeatureToggles): boolean {
  return Boolean(features[feature]);
}
