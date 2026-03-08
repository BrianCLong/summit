"use strict";
/**
 * Unleash Provider
 *
 * Unleash integration for feature flags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnleashProvider = void 0;
const unleash_client_1 = require("unleash-client");
/**
 * Unleash feature flag provider
 */
class UnleashProvider {
    name = 'Unleash';
    unleash;
    ready = false;
    config;
    constructor(config) {
        this.config = config;
        const unleashConfig = {
            url: config.url,
            appName: config.appName,
            instanceId: config.instanceId,
            customHeaders: {
                ...(config.apiToken ? { Authorization: config.apiToken } : {}),
                ...config.customHeaders,
            },
            ...config.unleashConfig,
        };
        this.unleash = new unleash_client_1.Unleash(unleashConfig);
    }
    /**
     * Initialize the provider
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Unleash initialization timeout'));
            }, 10000);
            this.unleash.on('ready', () => {
                clearTimeout(timeout);
                this.ready = true;
                resolve();
            });
            this.unleash.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    /**
     * Shutdown the provider
     */
    async close() {
        this.unleash.destroy();
        this.ready = false;
    }
    /**
     * Check if provider is ready
     */
    isReady() {
        return this.ready;
    }
    /**
     * Evaluate a boolean flag
     */
    async getBooleanFlag(key, defaultValue, context) {
        const unleashContext = this.buildUnleashContext(context);
        const value = this.unleash.isEnabled(key, unleashContext, defaultValue);
        const variant = this.unleash.getVariant(key, unleashContext);
        return {
            key,
            value,
            variation: variant?.name,
            exists: variant?.enabled ?? false,
            reason: this.determineReason(variant?.enabled ?? false),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a string flag
     */
    async getStringFlag(key, defaultValue, context) {
        const unleashContext = this.buildUnleashContext(context);
        const variant = this.unleash.getVariant(key, unleashContext);
        const value = variant?.enabled ? variant.payload?.value ?? defaultValue : defaultValue;
        return {
            key,
            value,
            variation: variant?.name,
            exists: variant?.enabled ?? false,
            reason: this.determineReason(variant?.enabled ?? false),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a number flag
     */
    async getNumberFlag(key, defaultValue, context) {
        const unleashContext = this.buildUnleashContext(context);
        const variant = this.unleash.getVariant(key, unleashContext);
        let value = defaultValue;
        if (variant?.enabled && variant.payload?.value) {
            const parsed = parseFloat(variant.payload.value);
            value = isNaN(parsed) ? defaultValue : parsed;
        }
        return {
            key,
            value,
            variation: variant?.name,
            exists: variant?.enabled ?? false,
            reason: this.determineReason(variant?.enabled ?? false),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a JSON flag
     */
    async getJSONFlag(key, defaultValue, context) {
        const unleashContext = this.buildUnleashContext(context);
        const variant = this.unleash.getVariant(key, unleashContext);
        let value = defaultValue;
        if (variant?.enabled && variant.payload?.value) {
            try {
                value = JSON.parse(variant.payload.value);
            }
            catch {
                value = defaultValue;
            }
        }
        return {
            key,
            value,
            variation: variant?.name,
            exists: variant?.enabled ?? false,
            reason: this.determineReason(variant?.enabled ?? false),
            timestamp: Date.now(),
        };
    }
    /**
     * Get all flag values for context
     */
    async getAllFlags(context) {
        // Unleash doesn't provide a built-in method to get all flags
        // This would require tracking all flag keys separately
        return {};
    }
    /**
     * Get flag definition
     */
    async getFlagDefinition(key) {
        // Unleash SDK doesn't provide full flag metadata
        // This would require using the Unleash Admin API
        return null;
    }
    /**
     * List all flags
     */
    async listFlags() {
        // Unleash SDK doesn't provide full flag metadata
        // This would require using the Unleash Admin API
        return [];
    }
    /**
     * Track an event/metric
     */
    async track(eventName, context, data) {
        // Unleash doesn't have built-in custom event tracking
        // Events would need to be sent to a separate analytics service
    }
    /**
     * Build Unleash context from flag context
     */
    buildUnleashContext(context) {
        const unleashContext = {
            userId: context.userId,
            sessionId: context.sessionId,
            remoteAddress: context.ipAddress,
            properties: {},
        };
        if (context.userEmail) {
            unleashContext.properties.email = context.userEmail;
        }
        if (context.tenantId) {
            unleashContext.properties.tenantId = context.tenantId;
        }
        if (context.environment) {
            unleashContext.environment = context.environment;
        }
        if (context.userRole) {
            unleashContext.properties.role = Array.isArray(context.userRole)
                ? context.userRole.join(',')
                : context.userRole;
        }
        if (context.location) {
            if (context.location.country) {
                unleashContext.properties.country = context.location.country;
            }
            if (context.location.region) {
                unleashContext.properties.region = context.location.region;
            }
            if (context.location.city) {
                unleashContext.properties.city = context.location.city;
            }
        }
        // Add custom attributes
        if (context.attributes) {
            unleashContext.properties = {
                ...unleashContext.properties,
                ...context.attributes,
            };
        }
        return unleashContext;
    }
    /**
     * Determine evaluation reason
     */
    determineReason(enabled) {
        return enabled ? 'RULE_MATCH' : 'DEFAULT';
    }
}
exports.UnleashProvider = UnleashProvider;
