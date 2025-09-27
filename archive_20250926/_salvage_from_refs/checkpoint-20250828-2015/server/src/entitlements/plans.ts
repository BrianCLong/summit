/**
 * Defines the shape of usage limits for a feature.
 */
export type Limit = {
  monthly?: number; // Total allowed per calendar month
  daily?: number;   // Total allowed per calendar day
  ratePerMin?: number; // Max requests per minute (token bucket)
};

/**
 * A map of feature names (e.g., 'predict.suggestLinks') to their limits.
 */
export type EntitlementMap = Record<string, Limit>;

/**
 * Default plan definitions.
 * In a real system, this would likely be loaded from a database or config file,
 * but is stored here as a fallback.
 */
export const DEFAULT_PLANS: Record<string, EntitlementMap> = {
  free: {
    'graph.query': { daily: 2000, ratePerMin: 60 },
    'predict.suggestLinks': { daily: 200, ratePerMin: 10 },
    'export.pdf': { daily: 20 },
    'export.zip': { daily: 5 },
  },
  pro: {
    'graph.query': { monthly: 5_000_000, ratePerMin: 500 },
    'predict.suggestLinks': { monthly: 100_000, ratePerMin: 120 },
    'export.pdf': { monthly: 10_000 },
    'export.zip': { monthly: 1_000 },
  },
  enterprise: {
    // Enterprise is unlimited for all features by default.
    // The wildcard '.*' matches any sub-feature.
    'graph.*': {},
    'predict.*': {},
    'export.*': {},
  },
};
