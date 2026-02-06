export type FeatureKey =
  // Infrastructure / Core
  | 'ai.enabled'
  | 'kafka.enabled'
  | 'maestro.mcpEnabled'
  | 'maestro.pipelinesEnabled'
  | 'opentelemetry.enabled'

  // MVP1 Features (Consolidated)
  | 'mvp1.authentication'
  | 'mvp1.authorizationRbac'
  | 'mvp1.tenancyIsolation'
  | 'mvp1.auditLogging'
  | 'mvp1.dataIngestion'
  | 'mvp1.graphExploration'
  | 'mvp1.searchElastic'
  | 'mvp1.comments'
  | 'mvp1.notifications'
  | 'mvp1.workspaces'
  | 'mvp1.csvExports'

  // Application Features
  | 'rbac.fineGrained'
  | 'audit.trail'
  | 'copilot.service'
  | 'analytics.panel'
  | 'pdf.export'
  | 'narrative.simulation' // from mvp1-features
  | 'graphrag.neptuneManaged'

  // Agent Features (Consolidated)
  | 'agent.memory'
  | 'agent.toolUse'
  | 'agent.reflection'
  | 'agent.planning'
  | 'agent.multiSwarm'
  | 'agent.autonomousDeployment'
  | 'agent.singlaub'
  | 'agent.lemay'
  | 'agent.angleton'
  | 'agent.budanov'
  | 'agent.wolf'
  | 'agent.harel'
  | 'agent.gehlen'

  // New/Requested
  | 'maestro.newRunConsole'
  | 'llm.experimentalRouting'
  | 'dashboard.realtime'
  | 'ci.fastLane'
  | 'security.strictAuth'
  | 'e2e.testModeApi'

  // Post-GA Evolution (v3.1.0+)
  // Onboarding & Education
  | 'onboarding.enhancedFlow'
  | 'onboarding.guidedTours'
  | 'onboarding.sampleContent'
  | 'onboarding.contextualHelp'

  // Adoption Analytics
  | 'analytics.adoption'
  | 'analytics.cohorts'
  | 'analytics.funnels'
  | 'analytics.productDashboard'

  // Internationalization
  | 'i18n.enabled'
  | 'i18n.autoDetect'
  | 'i18n.regionalCompliance'

  // Experimentation
  | 'experimentation.abTesting'
  | 'experimentation.multivariate'
  | 'experimentation.featureRollout'

  // Support Center
  | 'support.knowledgeBase'
  | 'support.faq'
  | 'support.tickets'
  | 'support.liveChat'
  | 'support.escalation'

  // Marketplace
  | 'marketplace.public'
  | 'marketplace.developerPortal'
  | 'marketplace.reviews'
  | 'marketplace.revenueShare'

  // Community
  | 'community.forum'
  | 'community.discord'
  | 'community.contributions';

export interface FeatureContext {
  tenantId?: string;
  userId?: string;
  env?: string;
}

export class FeatureFlags {
  private static instance: FeatureFlags;
  private features: Partial<Record<FeatureKey, boolean>>;

  private constructor(features: Partial<Record<FeatureKey, boolean>> = {}) {
    this.features = features;
  }

  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags(FeatureFlags.loadFromEnv());
    }
    return FeatureFlags.instance;
  }

  // Helper to parse boolean from env string safely
  private static parseBool(value: string | undefined): boolean | undefined {
    if (value === undefined || value === '') return undefined;
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;

    // STRICT: Any non-empty value that isn't "true"/"1" is treated as FALSE,
    // explicitly overriding the default. This matches legacy behavior where
    // `val === 'true'` implies anything else is false.
    return false;
  }

  private static loadFromEnv(): Partial<Record<FeatureKey, boolean>> {
    const features: Partial<Record<FeatureKey, boolean>> = {};

    // Explicit mapping for legacy environment variables
    const legacyMappings: Record<string, FeatureKey> = {
      'FEATURE_RBAC_FINE_GRAINED': 'rbac.fineGrained',
      'FEATURE_AUDIT_TRAIL': 'audit.trail',
      'FEATURE_COPILOT_SERVICE': 'copilot.service',
      'FEATURE_ANALYTICS_PANEL': 'analytics.panel',
      'FEATURE_PDF_EXPORT': 'pdf.export',
      'FEATURE_NARRATIVE_SIMULATION': 'narrative.simulation',
      'FEATURE_AGENT_ANGLETON': 'agent.angleton',
      'FEATURE_AGENT_HAREL': 'agent.harel',
      'FEATURE_AGENT_SINGLAUB': 'agent.singlaub',
      'FEATURE_AGENT_LEMAY': 'agent.lemay',
      'FEATURE_AGENT_BUDANOV': 'agent.budanov',
      'FEATURE_AGENT_WOLF': 'agent.wolf',
      'FEATURE_AGENT_GEHLEN': 'agent.gehlen',
      'FEATURE_AI_ENABLED': 'ai.enabled',
      'FEATURE_KAFKA_ENABLED': 'kafka.enabled',
      'FEATURE_OPENTELEMETRY_ENABLED': 'opentelemetry.enabled'
    };

    // Load mapped legacy vars
    for (const [envKey, featureKey] of Object.entries(legacyMappings)) {
      const parsed = FeatureFlags.parseBool(process.env[envKey]);
      if (parsed !== undefined) {
        features[featureKey] = parsed;
      }
    }

    // Load standard keys (e.g. FEATURE_MAESTRO_MCPENABLED -> maestro.mcpEnabled)
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('FEATURE_') && !legacyMappings[key]) {
         // Fallback logic could go here if needed
      }
    }

    // Hardcoded defaults for MVP continuity
    const defaults = {
        // MVP1 Features
        'mvp1.authentication': true,
        'mvp1.authorizationRbac': true,
        'mvp1.tenancyIsolation': true,
        'mvp1.auditLogging': true,
        'mvp1.dataIngestion': true,
        'mvp1.graphExploration': true,
        'mvp1.searchElastic': true,
        'mvp1.comments': true,
        'mvp1.notifications': true,
        'mvp1.workspaces': true,
        'mvp1.csvExports': true,

        // Application Features
        'rbac.fineGrained': true,
        'audit.trail': true,
        'copilot.service': true,
        'analytics.panel': true,
        'pdf.export': true,
        'opentelemetry.enabled': true,
        'narrative.simulation': true,
        'graphrag.neptuneManaged': false,

        // Agent Features
        'agent.memory': true,
        'agent.toolUse': true,
        'agent.reflection': true,
        'agent.planning': true,
        'agent.singlaub': true,
        'agent.lemay': true,
        'agent.angleton': true,
        'agent.budanov': true,
        // Agents not enabled by default in original file but listed as keys
        'agent.multiSwarm': false,
        'agent.autonomousDeployment': false,
    };

    return { ...defaults, ...features };
  }

  isEnabled(key: FeatureKey, context?: FeatureContext): boolean {
    return this.features[key] ?? false;
  }

  // Returns all current feature flags
  getAll(): Record<FeatureKey, boolean> {
    // We return defaults + loaded overrides.
    // Note: 'features' in constructor already contains merged defaults+overrides if loaded via getInstance()
    return this.features as Record<FeatureKey, boolean>;
  }

  update(features: Partial<Record<FeatureKey | string, boolean>>): void {
     // Handle updates, potentially with legacy keys
     const normalized: Partial<Record<FeatureKey, boolean>> = {};

     // Inverse mapping for lookup
     const legacyToNew: Record<string, FeatureKey> = {
        'RBAC_FINE_GRAINED': 'rbac.fineGrained',
        'AUDIT_TRAIL': 'audit.trail',
        'COPILOT_SERVICE': 'copilot.service',
        'ANALYTICS_PANEL': 'analytics.panel',
        'PDF_EXPORT': 'pdf.export',
        'NARRATIVE_SIMULATION': 'narrative.simulation',
        'AGENT_ANGLETON': 'agent.angleton',
        'AGENT_HAREL': 'agent.harel',
        'AGENT_SINGLAUB': 'agent.singlaub',
        'AGENT_LEMAY': 'agent.lemay',
        'AGENT_BUDANOV': 'agent.budanov',
        'AGENT_WOLF': 'agent.wolf',
        'AGENT_GEHLEN': 'agent.gehlen',
        'AI_ENABLED': 'ai.enabled',
        'KAFKA_ENABLED': 'kafka.enabled',
        'OPENTELEMETRY_ENABLED': 'opentelemetry.enabled'
     };

     for (const [key, value] of Object.entries(features)) {
         if (legacyToNew[key]) {
             normalized[legacyToNew[key]] = value;
         } else {
             // Assume it's a valid key
             normalized[key as FeatureKey] = value;
         }
     }

    this.features = { ...this.features, ...normalized };
  }

  static isEnabled(key: FeatureKey, context?: FeatureContext): boolean {
      return FeatureFlags.getInstance().isEnabled(key, context);
  }

  getVariant<T = string | number | boolean>(
    key: FeatureKey,
    context?: FeatureContext,
  ): T | undefined {
    return this.features[key] as unknown as T;
  }
}

/**
 * Decorator for requiring a feature to be enabled
 * Re-implemented to maintain compatibility with legacy code
 */
export function requireFeature(feature: FeatureKey) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      if (!FeatureFlags.isEnabled(feature)) {
        throw new Error(`Feature ${feature} is not enabled`);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
