"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlags = void 0;
exports.requireFeature = requireFeature;
class FeatureFlags {
    static instance;
    features;
    constructor(features = {}) {
        this.features = features;
    }
    static getInstance() {
        if (!FeatureFlags.instance) {
            FeatureFlags.instance = new FeatureFlags(FeatureFlags.loadFromEnv());
        }
        return FeatureFlags.instance;
    }
    // Helper to parse boolean from env string safely
    static parseBool(value) {
        if (value === undefined || value === '')
            return undefined;
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1')
            return true;
        // STRICT: Any non-empty value that isn't "true"/"1" is treated as FALSE,
        // explicitly overriding the default. This matches legacy behavior where
        // `val === 'true'` implies anything else is false.
        return false;
    }
    static loadFromEnv() {
        const features = {};
        // Explicit mapping for legacy environment variables
        const legacyMappings = {
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
    isEnabled(key, context) {
        return this.features[key] ?? false;
    }
    // Returns all current feature flags
    getAll() {
        // We return defaults + loaded overrides.
        // Note: 'features' in constructor already contains merged defaults+overrides if loaded via getInstance()
        return this.features;
    }
    update(features) {
        // Handle updates, potentially with legacy keys
        const normalized = {};
        // Inverse mapping for lookup
        const legacyToNew = {
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
            }
            else {
                // Assume it's a valid key
                normalized[key] = value;
            }
        }
        this.features = { ...this.features, ...normalized };
    }
    static isEnabled(key, context) {
        return FeatureFlags.getInstance().isEnabled(key, context);
    }
    getVariant(key, context) {
        return this.features[key];
    }
}
exports.FeatureFlags = FeatureFlags;
/**
 * Decorator for requiring a feature to be enabled
 * Re-implemented to maintain compatibility with legacy code
 */
function requireFeature(feature) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            if (!FeatureFlags.isEnabled(feature)) {
                throw new Error(`Feature ${feature} is not enabled`);
            }
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
