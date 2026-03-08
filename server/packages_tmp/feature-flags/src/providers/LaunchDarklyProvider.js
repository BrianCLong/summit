"use strict";
/**
 * LaunchDarkly Provider
 *
 * LaunchDarkly integration for feature flags
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchDarklyProvider = void 0;
const ld = __importStar(require("launchdarkly-node-server-sdk"));
/**
 * LaunchDarkly feature flag provider
 */
class LaunchDarklyProvider {
    config;
    name = 'LaunchDarkly';
    client;
    ready = false;
    timeout;
    constructor(config) {
        this.config = config;
        this.timeout = config.timeout ?? 10000; // 10 seconds default
        // Initialize LaunchDarkly client
        this.client = ld.init(config.sdkKey, {
            ...config.options,
            logger: config.options?.logger ?? ld.basicLogger({ level: 'info' }),
        });
    }
    /**
     * Initialize the provider
     */
    async initialize() {
        try {
            await this.client.waitForInitialization();
            this.ready = true;
        }
        catch (error) {
            throw new Error(`LaunchDarkly initialization failed: ${error.message}`);
        }
    }
    /**
     * Shutdown the provider
     */
    async close() {
        await this.client.close();
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
        const ldContext = this.buildLDContext(context);
        const detail = await this.client.variationDetail(key, ldContext, defaultValue);
        return {
            key,
            value: detail.value,
            variation: detail.variationIndex?.toString(),
            exists: detail.variationIndex !== null,
            reason: this.mapReason(detail.reason),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a string flag
     */
    async getStringFlag(key, defaultValue, context) {
        const ldContext = this.buildLDContext(context);
        const detail = await this.client.variationDetail(key, ldContext, defaultValue);
        return {
            key,
            value: detail.value,
            variation: detail.variationIndex?.toString(),
            exists: detail.variationIndex !== null,
            reason: this.mapReason(detail.reason),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a number flag
     */
    async getNumberFlag(key, defaultValue, context) {
        const ldContext = this.buildLDContext(context);
        const detail = await this.client.variationDetail(key, ldContext, defaultValue);
        return {
            key,
            value: detail.value,
            variation: detail.variationIndex?.toString(),
            exists: detail.variationIndex !== null,
            reason: this.mapReason(detail.reason),
            timestamp: Date.now(),
        };
    }
    /**
     * Evaluate a JSON flag
     */
    async getJSONFlag(key, defaultValue, context) {
        const ldContext = this.buildLDContext(context);
        const detail = await this.client.variationDetail(key, ldContext, defaultValue);
        return {
            key,
            value: detail.value,
            variation: detail.variationIndex?.toString(),
            exists: detail.variationIndex !== null,
            reason: this.mapReason(detail.reason),
            timestamp: Date.now(),
        };
    }
    /**
     * Get all flag values for context
     */
    async getAllFlags(context) {
        const ldContext = this.buildLDContext(context);
        const allFlags = await this.client.allFlagsState(ldContext, {
            withReasons: true,
        });
        const result = {};
        const flags = allFlags.allValues();
        for (const [key, value] of Object.entries(flags)) {
            const flagState = allFlags.getFlagValue(key);
            const reason = allFlags.getFlagReason(key);
            result[key] = {
                key,
                value: flagState ?? value,
                variation: undefined,
                exists: false,
                reason: reason ? this.mapReason(reason) : 'DEFAULT',
                timestamp: Date.now(),
            };
        }
        return result;
    }
    /**
     * Get flag definition (not fully supported by LaunchDarkly SDK)
     */
    async getFlagDefinition(key) {
        // LaunchDarkly SDK doesn't provide full flag metadata in server-side SDK
        // This would require using the LaunchDarkly REST API
        return null;
    }
    /**
     * List all flags (not fully supported by LaunchDarkly SDK)
     */
    async listFlags() {
        // LaunchDarkly SDK doesn't provide full flag metadata in server-side SDK
        // This would require using the LaunchDarkly REST API
        return [];
    }
    /**
     * Track an event/metric
     */
    async track(eventName, context, data) {
        const ldContext = this.buildLDContext(context);
        this.client.track(eventName, ldContext, data);
    }
    /**
     * Build LaunchDarkly context from flag context
     */
    buildLDContext(context) {
        const ldContext = {
            kind: 'user',
            key: context.userId || context.sessionId || 'anonymous',
        };
        if (context.userEmail) {
            ldContext.email = context.userEmail;
        }
        if (context.tenantId) {
            ldContext.custom = {
                ...ldContext.custom,
                tenantId: context.tenantId,
            };
        }
        if (context.environment) {
            ldContext.custom = {
                ...ldContext.custom,
                environment: context.environment,
            };
        }
        if (context.userRole) {
            ldContext.custom = {
                ...ldContext.custom,
                role: Array.isArray(context.userRole)
                    ? context.userRole
                    : [context.userRole],
            };
        }
        if (context.ipAddress) {
            ldContext.ip = context.ipAddress;
        }
        if (context.location) {
            ldContext.country = context.location.country;
            ldContext.custom = {
                ...ldContext.custom,
                region: context.location.region,
                city: context.location.city,
            };
        }
        // Add custom attributes
        if (context.attributes) {
            ldContext.custom = {
                ...ldContext.custom,
                ...context.attributes,
            };
        }
        return ldContext;
    }
    /**
     * Map LaunchDarkly reason to our reason type
     */
    mapReason(reason) {
        switch (reason.kind) {
            case 'TARGET_MATCH':
                return 'TARGET_MATCH';
            case 'RULE_MATCH':
                return 'RULE_MATCH';
            case 'PREREQUISITE_FAILED':
                return 'PREREQUISITE_FAILED';
            case 'OFF':
                return 'OFF';
            case 'FALLTHROUGH':
                return 'DEFAULT';
            case 'ERROR':
                return 'ERROR';
            default:
                return 'DEFAULT';
        }
    }
    /**
     * Flush all pending events
     */
    async flush() {
        await this.client.flush();
    }
}
exports.LaunchDarklyProvider = LaunchDarklyProvider;
