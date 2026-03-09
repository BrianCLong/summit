/**
 * Runtime Gates for Experimental Features
 *
 * Provides fail-fast validation for features that are incomplete or experimental.
 * These gates prevent false confidence by blocking usage of placeholder implementations.
 *
 * Resolution: CN-010, CN-023, CN-024, CN-026, CN-027
 */

export class ExperimentalFeatureError extends Error {
  constructor(feature: string, message: string) {
    super(`[EXPERIMENTAL FEATURE BLOCKED] ${feature}: ${message}`);
    this.name = 'ExperimentalFeatureError';
  }
}

export interface FeatureGateConfig {
  enabled: boolean;
  requiredConfig?: string[];
  implementationStatus: 'placeholder' | 'partial' | 'complete';
}

/**
 * Central registry of experimental features and their gate status
 */
export const EXPERIMENTAL_FEATURES: Record<string, FeatureGateConfig> = {
  FEDERAL_INTELLIGENCE: {
    enabled: process.env.FEATURE_FEDERAL_INTEL === 'true',
    requiredConfig: ['FBI_API_KEY', 'NSA_API_ENDPOINT', 'CIA_CREDENTIALS'],
    implementationStatus: 'placeholder',
  },
  HELPDESK_INTEGRATIONS: {
    enabled: process.env.FEATURE_HELPDESK === 'true',
    requiredConfig: ['ZENDESK_API_KEY', 'FRESHDESK_DOMAIN'],
    implementationStatus: 'placeholder',
  },
  REVOPS_AGENT: {
    enabled: process.env.FEATURE_REVOPS_AGENT === 'true',
    requiredConfig: ['CRM_API_KEY', 'FORECASTING_SERVICE_URL'],
    implementationStatus: 'placeholder',
  },
  CLOUD_ORCHESTRATOR: {
    enabled: process.env.FEATURE_CLOUD_ORCHESTRATOR === 'true',
    requiredConfig: ['AWS_CREDENTIALS', 'AZURE_CREDENTIALS', 'GCP_CREDENTIALS'],
    implementationStatus: 'placeholder',
  },
  MIGRATION_VALIDATOR: {
    enabled: process.env.FEATURE_MIGRATION_VALIDATOR === 'true',
    requiredConfig: ['DATABASE_URL'],
    implementationStatus: 'placeholder',
  },
  ANALYTICS_ENGINE: {
    enabled: process.env.FEATURE_ANALYTICS === 'true',
    requiredConfig: ['ANALYTICS_DATA_STORE'],
    implementationStatus: 'partial',
  },
};

/**
 * Validates that a feature is enabled and properly configured
 *
 * @throws ExperimentalFeatureError if feature is not enabled or misconfigured
 */
export function requireFeature(featureName: keyof typeof EXPERIMENTAL_FEATURES): void {
  const config = EXPERIMENTAL_FEATURES[featureName];

  if (!config) {
    throw new ExperimentalFeatureError(
      featureName,
      'Feature not registered in experimental features registry',
    );
  }

  if (!config.enabled) {
    throw new ExperimentalFeatureError(
      featureName,
      `Feature is disabled. Set FEATURE_${featureName}=true to enable (not recommended for production)`,
    );
  }

  if (config.implementationStatus === 'placeholder') {
    throw new ExperimentalFeatureError(
      featureName,
      'Feature implementation is a placeholder. Cannot use in production.',
    );
  }

  // Check required configuration
  if (config.requiredConfig) {
    const missingConfig = config.requiredConfig.filter(
      (key) => !process.env[key],
    );

    if (missingConfig.length > 0) {
      throw new ExperimentalFeatureError(
        featureName,
        `Missing required configuration: ${missingConfig.join(', ')}`,
      );
    }
  }
}

/**
 * Checks if a feature is available (enabled and configured)
 * Non-throwing version for conditional logic
 */
export function isFeatureAvailable(featureName: keyof typeof EXPERIMENTAL_FEATURES): boolean {
  try {
    requireFeature(featureName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets human-readable status for all experimental features
 * Useful for dashboards and health checks
 */
export function getFeatureStatus(): Record<string, {
  enabled: boolean;
  status: string;
  ready: boolean;
}> {
  const status: Record<string, any> = {};

  for (const [name, config] of Object.entries(EXPERIMENTAL_FEATURES)) {
    const ready = isFeatureAvailable(name as keyof typeof EXPERIMENTAL_FEATURES);
    status[name] = {
      enabled: config.enabled,
      status: config.implementationStatus,
      ready,
    };
  }

  return status;
}

/**
 * Startup validation: logs warnings for enabled experimental features
 */
export function validateExperimentalFeaturesAtStartup(): void {
  console.log('[RUNTIME GATES] Validating experimental features...');

  const enabledExperimental = Object.entries(EXPERIMENTAL_FEATURES)
    .filter(([_, config]) => config.enabled);

  if (enabledExperimental.length === 0) {
    console.log('[RUNTIME GATES] No experimental features enabled');
    return;
  }

  console.warn('[RUNTIME GATES] WARNING: Experimental features enabled:');
  for (const [name, config] of enabledExperimental) {
    console.warn(`  - ${name} (${config.implementationStatus})`);

    if (config.implementationStatus === 'placeholder') {
      console.error(`    ⚠️  CRITICAL: ${name} is a PLACEHOLDER implementation!`);
      console.error(`    ⚠️  This feature will throw errors if used.`);
    }
  }

  // In production, block startup if placeholders are enabled
  if (process.env.NODE_ENV === 'production') {
    const placeholders = enabledExperimental.filter(
      ([_, config]) => config.implementationStatus === 'placeholder',
    );

    if (placeholders.length > 0) {
      const names = placeholders.map(([name]) => name).join(', ');
      throw new Error(
        `[RUNTIME GATE VIOLATION] Cannot start in production with placeholder features enabled: ${names}`,
      );
    }
  }
}
