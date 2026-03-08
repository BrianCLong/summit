"use strict";
/**
 * Feature Flag Service
 *
 * Core service for feature flag evaluation with caching, analytics, and metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
/**
 * Feature Flag Service
 */
class FeatureFlagService extends eventemitter3_1.default {
    provider;
    cache;
    config;
    metrics;
    isInitialized = false;
    analyticsBuffer = [];
    analyticsFlushInterval;
    constructor(config) {
        super();
        this.provider = config.provider;
        this.cache = config.cache;
        this.config = {
            provider: config.provider,
            cacheTTL: config.cacheTTL ?? 300, // 5 minutes default
            enableCache: config.enableCache ?? true,
            enableAnalytics: config.enableAnalytics ?? true,
            enableMetrics: config.enableMetrics ?? true,
            offline: config.offline ?? false,
            cache: config.cache,
            defaultContext: config.defaultContext,
        };
    }
    /**
     * Initialize the feature flag service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Initialize provider
            await this.provider.initialize();
            // Start analytics flush interval if enabled
            if (this.config.enableAnalytics) {
                this.startAnalyticsFlush();
            }
            this.isInitialized = true;
            this.emit('ready');
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Shutdown the service
     */
    async close() {
        if (this.analyticsFlushInterval) {
            clearInterval(this.analyticsFlushInterval);
        }
        // Flush remaining analytics
        await this.flushAnalytics();
        // Close provider
        await this.provider.close();
        this.isInitialized = false;
    }
    /**
     * Check if service is ready
     */
    isReady() {
        return this.isInitialized && this.provider.isReady();
    }
    /**
     * Evaluate a boolean flag
     */
    async getBooleanFlag(key, defaultValue, context) {
        const evaluation = await this.evaluateFlag(key, defaultValue, context, 'boolean');
        return evaluation.value;
    }
    /**
     * Evaluate a string flag
     */
    async getStringFlag(key, defaultValue, context) {
        const evaluation = await this.evaluateFlag(key, defaultValue, context, 'string');
        return evaluation.value;
    }
    /**
     * Evaluate a number flag
     */
    async getNumberFlag(key, defaultValue, context) {
        const evaluation = await this.evaluateFlag(key, defaultValue, context, 'number');
        return evaluation.value;
    }
    /**
     * Evaluate a JSON flag
     */
    async getJSONFlag(key, defaultValue, context) {
        const evaluation = await this.evaluateFlag(key, defaultValue, context, 'json');
        return evaluation.value;
    }
    /**
     * Get detailed evaluation result
     */
    async getEvaluation(key, defaultValue, context) {
        return this.evaluateFlag(key, defaultValue, context);
    }
    /**
     * Get all flag values for context
     */
    async getAllFlags(context) {
        const fullContext = this.buildContext(context);
        const allFlags = await this.provider.getAllFlags(fullContext);
        const result = {};
        for (const [key, evaluation] of Object.entries(allFlags)) {
            result[key] = evaluation.value;
        }
        return result;
    }
    /**
     * Track a custom event
     */
    async track(eventName, context, data) {
        const fullContext = this.buildContext(context);
        // Track with provider
        await this.provider.track(eventName, fullContext, data);
        // Record analytics event
        if (this.config.enableAnalytics) {
            this.recordAnalyticsEvent({
                type: 'track',
                flagKey: eventName,
                context: fullContext,
                timestamp: Date.now(),
                data,
            });
        }
    }
    /**
     * Get flag definition
     */
    async getFlagDefinition(key) {
        return this.provider.getFlagDefinition(key);
    }
    /**
     * List all flags
     */
    async listFlags() {
        return this.provider.listFlags();
    }
    /**
     * Set metrics instance
     */
    setMetrics(metrics) {
        this.metrics = metrics;
    }
    /**
     * Get metrics instance
     */
    getMetrics() {
        return this.metrics;
    }
    /**
     * Evaluate a flag with caching and metrics
     */
    async evaluateFlag(key, defaultValue, context, type) {
        const startTime = Date.now();
        const fullContext = this.buildContext(context);
        try {
            // Check cache first
            if (this.config.enableCache && this.cache) {
                const cached = await this.getCachedEvaluation(key, fullContext);
                if (cached) {
                    this.emit('cacheHit', key);
                    if (this.metrics) {
                        this.metrics.recordCacheHit(key);
                    }
                    return cached;
                }
                this.emit('cacheMiss', key);
                if (this.metrics) {
                    this.metrics.recordCacheMiss(key);
                }
            }
            // Evaluate with provider
            let evaluation;
            switch (type) {
                case 'boolean':
                    evaluation = (await this.provider.getBooleanFlag(key, defaultValue, fullContext));
                    break;
                case 'string':
                    evaluation = (await this.provider.getStringFlag(key, defaultValue, fullContext));
                    break;
                case 'number':
                    evaluation = (await this.provider.getNumberFlag(key, defaultValue, fullContext));
                    break;
                case 'json':
                    evaluation = await this.provider.getJSONFlag(key, defaultValue, fullContext);
                    break;
                default:
                    // Auto-detect type
                    if (typeof defaultValue === 'boolean') {
                        evaluation = (await this.provider.getBooleanFlag(key, defaultValue, fullContext));
                    }
                    else if (typeof defaultValue === 'string') {
                        evaluation = (await this.provider.getStringFlag(key, defaultValue, fullContext));
                    }
                    else if (typeof defaultValue === 'number') {
                        evaluation = (await this.provider.getNumberFlag(key, defaultValue, fullContext));
                    }
                    else {
                        evaluation = await this.provider.getJSONFlag(key, defaultValue, fullContext);
                    }
            }
            // Cache the result
            if (this.config.enableCache && this.cache && evaluation.exists) {
                await this.setCachedEvaluation(key, fullContext, evaluation);
            }
            // Record metrics
            const duration = Date.now() - startTime;
            if (this.metrics && evaluation.variation) {
                this.metrics.recordEvaluation(key, evaluation.variation, duration);
            }
            // Record analytics
            if (this.config.enableAnalytics) {
                this.recordAnalyticsEvent({
                    type: 'evaluation',
                    flagKey: key,
                    value: evaluation.value,
                    variation: evaluation.variation,
                    context: fullContext,
                    timestamp: Date.now(),
                    reason: evaluation.reason,
                });
            }
            // Emit event
            this.emit('evaluation', {
                type: 'evaluation',
                flagKey: key,
                value: evaluation.value,
                variation: evaluation.variation,
                context: fullContext,
                timestamp: Date.now(),
                reason: evaluation.reason,
            });
            return evaluation;
        }
        catch (error) {
            if (this.metrics) {
                this.metrics.recordError(key, error);
            }
            this.emit('error', error);
            // Return fallback evaluation
            return {
                key,
                value: defaultValue,
                exists: false,
                reason: 'ERROR',
                timestamp: Date.now(),
            };
        }
    }
    /**
     * Build full context from partial context
     */
    buildContext(context) {
        return {
            ...this.config.defaultContext,
            ...context,
        };
    }
    /**
     * Get cached evaluation
     */
    async getCachedEvaluation(key, context) {
        if (!this.cache) {
            return null;
        }
        try {
            const cached = await this.cache.get(key, context);
            if (cached) {
                cached.fromCache = true;
            }
            return cached;
        }
        catch (error) {
            // Cache errors should not break evaluation
            return null;
        }
    }
    /**
     * Set cached evaluation
     */
    async setCachedEvaluation(key, context, evaluation) {
        if (!this.cache) {
            return;
        }
        try {
            await this.cache.set(key, context, evaluation, this.config.cacheTTL);
        }
        catch (error) {
            // Cache errors should not break evaluation
        }
    }
    /**
     * Record analytics event
     */
    recordAnalyticsEvent(event) {
        this.analyticsBuffer.push(event);
        // Flush if buffer is large
        if (this.analyticsBuffer.length >= 100) {
            this.flushAnalytics();
        }
    }
    /**
     * Start analytics flush interval
     */
    startAnalyticsFlush() {
        // Flush every 10 seconds
        this.analyticsFlushInterval = setInterval(() => {
            this.flushAnalytics();
        }, 10000);
    }
    /**
     * Flush analytics buffer
     */
    async flushAnalytics() {
        if (this.analyticsBuffer.length === 0) {
            return;
        }
        const events = [...this.analyticsBuffer];
        this.analyticsBuffer = [];
        // In a real implementation, this would send events to an analytics service
        // For now, we just emit them as events
        for (const event of events) {
            this.emit('evaluation', event);
        }
    }
}
exports.FeatureFlagService = FeatureFlagService;
