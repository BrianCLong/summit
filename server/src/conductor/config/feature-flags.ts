// @ts-nocheck
import logger from '../../config/logger.js';
import {
  featureFlagEnabledGauge,
  pricingRefreshBlockedTotal,
} from '../../metrics/federationMetrics.js';

export type FeatureFlags = {
  PRICE_AWARE_ENABLED: boolean;
  PRICING_REFRESH_ENABLED: boolean;
  CAPACITY_FUTURES_ENABLED: boolean;
  PRICE_AWARE_FORCE_POOL_ID?: string;
  PRICE_AWARE_FAIL_OPEN: boolean;
};

const truthyValues = new Set(['true', '1', 'yes', 'y', 'on']);
const falsyValues = new Set(['false', '0', 'no', 'n', 'off']);

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falsyValues.has(normalized)) return false;
  return defaultValue;
}

export function loadFeatureFlags(
  env: NodeJS.ProcessEnv = process.env,
): FeatureFlags {
  return {
    PRICE_AWARE_ENABLED: parseBoolean(env.PRICE_AWARE_ENABLED, true),
    PRICING_REFRESH_ENABLED: parseBoolean(env.PRICING_REFRESH_ENABLED, true),
    CAPACITY_FUTURES_ENABLED: parseBoolean(env.CAPACITY_FUTURES_ENABLED, true),
    PRICE_AWARE_FORCE_POOL_ID: env.PRICE_AWARE_FORCE_POOL_ID || undefined,
    PRICE_AWARE_FAIL_OPEN: parseBoolean(env.PRICE_AWARE_FAIL_OPEN, true),
  };
}

function updateFlagGauges(flags: FeatureFlags) {
  try {
    featureFlagEnabledGauge.labels('PRICE_AWARE_ENABLED').set(
      flags.PRICE_AWARE_ENABLED ? 1 : 0,
    );
    featureFlagEnabledGauge.labels('PRICING_REFRESH_ENABLED').set(
      flags.PRICING_REFRESH_ENABLED ? 1 : 0,
    );
    featureFlagEnabledGauge.labels('CAPACITY_FUTURES_ENABLED').set(
      flags.CAPACITY_FUTURES_ENABLED ? 1 : 0,
    );
    featureFlagEnabledGauge.labels('PRICE_AWARE_FAIL_OPEN').set(
      flags.PRICE_AWARE_FAIL_OPEN ? 1 : 0,
    );
  } catch (error: any) {
    logger.warn('Failed to publish feature flag gauges', {
      error: (error as Error).message,
    });
  }
}

let cachedFlags = loadFeatureFlags();
updateFlagGauges(cachedFlags);

export function getFeatureFlags(): FeatureFlags {
  return cachedFlags;
}

export function resetFeatureFlags(
  env: NodeJS.ProcessEnv = process.env,
): FeatureFlags {
  cachedFlags = loadFeatureFlags(env);
  updateFlagGauges(cachedFlags);
  return cachedFlags;
}

export function flagsSnapshot(): FeatureFlags {
  return { ...cachedFlags };
}

export function recordPricingRefreshBlocked() {
  pricingRefreshBlockedTotal.inc();
}
