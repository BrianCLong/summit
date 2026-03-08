"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigClient = void 0;
exports.createConfigClient = createConfigClient;
/**
 * Lightweight client SDK for the Config Service.
 * Designed for server-side usage with optional caching.
 */
class ConfigClient {
    baseUrl;
    apiKey;
    tenantId;
    environment;
    timeout;
    enableCache;
    cacheTtlMs;
    pollingIntervalMs;
    cache = new Map();
    pollingTimer;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.tenantId = options.tenantId;
        this.environment = options.environment;
        this.timeout = options.timeout ?? 5000;
        this.enableCache = options.enableCache ?? true;
        this.cacheTtlMs = options.cacheTtlMs ?? 60000; // 1 minute
        this.pollingIntervalMs = options.pollingIntervalMs ?? 30000; // 30 seconds
    }
    /**
     * Get a configuration value.
     */
    async getConfig(key, context, defaultValue) {
        const fullContext = this.buildContext(context);
        const cacheKey = `config:${key}:${JSON.stringify(fullContext)}`;
        // Check cache
        if (this.enableCache) {
            const cached = this.getCached(cacheKey);
            if (cached !== undefined) {
                return cached;
            }
        }
        try {
            const response = await this.graphql(`query GetConfig($key: String!, $context: ConfigContextInput) {
          configValue(key: $key, context: $context)
        }`, { key, context: fullContext });
            const value = response.configValue ?? defaultValue;
            if (this.enableCache && value !== undefined) {
                this.setCache(cacheKey, value);
            }
            return value;
        }
        catch (error) {
            console.error(`Failed to get config ${key}:`, error);
            return defaultValue;
        }
    }
    /**
     * Check if a feature flag is enabled.
     */
    async isFeatureEnabled(flagKey, context, defaultValue = false) {
        const result = await this.evaluateFlag(flagKey, context);
        return result.enabled ? (result.value === true) : defaultValue;
    }
    /**
     * Get the value of a feature flag.
     */
    async getFlagValue(flagKey, context, defaultValue) {
        const result = await this.evaluateFlag(flagKey, context);
        return result.enabled ? result.value : defaultValue;
    }
    /**
     * Evaluate a feature flag with full result details.
     */
    async evaluateFlag(flagKey, context) {
        const fullContext = this.buildEvaluationContext(context);
        const cacheKey = `flag:${flagKey}:${context.userId}`;
        if (this.enableCache) {
            const cached = this.getCached(cacheKey);
            if (cached !== undefined) {
                return cached;
            }
        }
        try {
            const response = await this.graphql(`query EvaluateFlag($flagKey: String!, $context: EvaluationContextInput!) {
          evaluateFlag(flagKey: $flagKey, context: $context) {
            flagKey
            value
            enabled
            reason
            ruleId
            segmentId
          }
        }`, { flagKey, context: fullContext });
            const result = response.evaluateFlag;
            if (this.enableCache) {
                this.setCache(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            console.error(`Failed to evaluate flag ${flagKey}:`, error);
            return {
                flagKey,
                value: undefined,
                enabled: false,
                reason: 'ERROR',
                ruleId: null,
                segmentId: null,
            };
        }
    }
    /**
     * Get experiment assignment for a user.
     */
    async getExperimentAssignment(experimentKey, context) {
        const fullContext = this.buildEvaluationContext(context);
        const cacheKey = `exp:${experimentKey}:${context.userId}`;
        if (this.enableCache) {
            const cached = this.getCached(cacheKey);
            if (cached !== undefined) {
                return cached;
            }
        }
        try {
            const response = await this.graphql(`query GetExperimentAssignment($experimentKey: String!, $context: EvaluationContextInput!) {
          getExperimentAssignment(experimentKey: $experimentKey, context: $context) {
            experimentId
            experimentKey
            variantId
            variantName
            value
            inExperiment
            reason
          }
        }`, { experimentKey, context: fullContext });
            const result = response.getExperimentAssignment;
            // Cache experiment assignments longer (sticky bucketing)
            if (this.enableCache) {
                this.setCache(cacheKey, result, this.cacheTtlMs * 10);
            }
            return result;
        }
        catch (error) {
            console.error(`Failed to get experiment assignment ${experimentKey}:`, error);
            return {
                experimentId: '',
                experimentKey,
                variantId: '',
                variantName: '',
                value: undefined,
                inExperiment: false,
                reason: 'ERROR',
            };
        }
    }
    /**
     * Batch evaluate multiple flags, experiments, and configs.
     */
    async batchEvaluate(context, options) {
        const fullContext = this.buildEvaluationContext(context);
        try {
            const response = await this.graphql(`query BatchEvaluate(
          $context: EvaluationContextInput!
          $flagKeys: [String!]
          $experimentKeys: [String!]
          $configKeys: [String!]
        ) {
          batchEvaluate(
            context: $context
            flagKeys: $flagKeys
            experimentKeys: $experimentKeys
            configKeys: $configKeys
          ) {
            flags
            experiments
            configs
            evaluatedAt
          }
        }`, {
                context: fullContext,
                flagKeys: options.flagKeys,
                experimentKeys: options.experimentKeys,
                configKeys: options.configKeys,
            });
            return response.batchEvaluate;
        }
        catch (error) {
            console.error('Batch evaluation failed:', error);
            return {
                flags: {},
                experiments: {},
                configs: {},
                evaluatedAt: Date.now(),
            };
        }
    }
    /**
     * Start background polling for cache refresh.
     */
    startPolling() {
        if (this.pollingTimer) {
            return;
        }
        this.pollingTimer = setInterval(() => {
            this.refreshCache();
        }, this.pollingIntervalMs);
    }
    /**
     * Stop background polling.
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
        }
    }
    /**
     * Clear the local cache.
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Close the client and release resources.
     */
    close() {
        this.stopPolling();
        this.clearCache();
    }
    // Private helpers
    buildContext(context) {
        return {
            environment: context?.environment ?? this.environment,
            tenantId: context?.tenantId ?? this.tenantId,
            userId: context?.userId,
            attributes: context?.attributes,
        };
    }
    buildEvaluationContext(context) {
        return {
            userId: context.userId,
            tenantId: context.tenantId ?? this.tenantId,
            environment: context.environment ?? this.environment,
            attributes: context.attributes ?? {},
        };
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    setCache(key, value, ttlMs = this.cacheTtlMs) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }
    async refreshCache() {
        // Prune expired entries
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
    async graphql(query, variables) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            if (this.tenantId) {
                headers['X-Tenant-ID'] = this.tenantId;
            }
            const response = await fetch(`${this.baseUrl}/graphql`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query, variables }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const json = await response.json();
            if (json.errors && json.errors.length > 0) {
                throw new Error(json.errors[0].message);
            }
            return json.data;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.ConfigClient = ConfigClient;
/**
 * Create a new ConfigClient instance.
 */
function createConfigClient(options) {
    return new ConfigClient(options);
}
