"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
class FeatureFlagService {
    redis;
    logger;
    repository;
    CACHE_PREFIX = 'feature_flag:';
    CACHE_TTL = 300; // 5 minutes
    constructor(redis, repository, logger) {
        this.redis = redis;
        this.repository = repository;
        this.logger = logger;
    }
    /**
     * Evaluate if a feature flag is enabled for a specific user/context
     */
    async isEnabled(flagKey, context = {}) {
        try {
            // Try to get from cache first
            const cachedResult = await this.getCachedEvaluation(flagKey, context);
            if (cachedResult !== null) {
                return cachedResult;
            }
            // Fetch flag from repository
            const flag = await this.repository.getFlag(flagKey);
            if (!flag) {
                this.logger.warn(`Feature flag not found: ${flagKey}`);
                return this.getDefaultValue(flagKey, false);
            }
            // Evaluate the flag
            const result = this.evaluateFlag(flag, context);
            // Cache the result
            await this.cacheEvaluation(flagKey, context, result);
            return result;
        }
        catch (error) {
            this.logger.error(`Error evaluating feature flag ${flagKey}:`, error);
            // Fallback to default value
            return this.getDefaultValue(flagKey, true);
        }
    }
    /**
     * Get feature flag value with variant support
     */
    async getVariant(flagKey, context = {}) {
        try {
            const flag = await this.repository.getFlag(flagKey);
            if (!flag) {
                return null;
            }
            if (flag.variants && Object.keys(flag.variants).length > 0) {
                // Use variant evaluation logic
                const bucket = this.getUserBucket(context.userId, flagKey);
                const variantKeys = Object.keys(flag.variants);
                const variantIndex = Math.floor((bucket / 100) * variantKeys.length);
                const selectedVariant = variantKeys[Math.min(variantIndex, variantKeys.length - 1)];
                // Cache variant evaluation
                const cacheKey = `${this.CACHE_PREFIX}variant:${flagKey}:${this.getContextHash(context)}`;
                await this.redis.set(cacheKey, selectedVariant, 'EX', this.CACHE_TTL);
                return flag.variants[selectedVariant];
            }
            // Fallback to boolean evaluation
            return (await this.isEnabled(flagKey, context));
        }
        catch (error) {
            this.logger.error(`Error getting feature flag variant ${flagKey}:`, error);
            return null;
        }
    }
    /**
     * Check if a flag is enabled based on conditions
     */
    evaluateFlag(flag, context) {
        // Check if flag is globally disabled
        if (!flag.enabled) {
            return false;
        }
        // Check schedule
        if (flag.scheduledChange) {
            const scheduledTime = new Date(flag.scheduledChange.timestamp);
            if (scheduledTime > new Date()) {
                // Apply scheduled change if it's in the future
                return flag.scheduledChange.newValue ?? flag.enabled;
            }
        }
        // Check kill switches (emergency overrides)
        if (flag.killSwitch) {
            return flag.killSwitch;
        }
        // Check environment-specific conditions
        if (flag.conditions && flag.conditions.env) {
            if (flag.conditions.env.includes(process.env.NODE_ENV || 'development')) {
                return flag.enabled;
            }
        }
        // Check per-user targeting
        if (context.userId && flag.targetUsers?.length) {
            return flag.targetUsers.includes(context.userId);
        }
        // Check per-group targeting
        if (context.groups && flag.targetGroups?.length) {
            const matchedGroup = context.groups.find(group => flag.targetGroups?.includes(group));
            if (matchedGroup) {
                return true;
            }
        }
        // Check percentage-based rollout
        if (typeof flag.rolloutPercentage === 'number' && context.userId) {
            const bucket = this.getUserBucket(context.userId, flag.key);
            return bucket < flag.rolloutPercentage;
        }
        // Check custom conditions
        if (flag.conditions && Object.keys(flag.conditions).length > 0) {
            return this.evaluateConditions(flag.conditions, context);
        }
        // Default to flag's enabled state
        return flag.enabled;
    }
    /**
     * Calculate a deterministic bucket for percentage-based rollouts
     */
    getUserBucket(userId, flagKey) {
        // Simple hash-based calculation for deterministic results
        const hashInput = `${userId}:${flagKey}`;
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            const char = hashInput.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Convert to positive number and mod 100 for percentage
        const absHash = Math.abs(hash);
        return absHash % 100;
    }
    /**
     * Evaluate complex conditions
     */
    evaluateConditions(conditions, context) {
        // This is a simplified implementation
        // In a real system, you'd have more complex condition evaluation logic
        // Check if user attributes match conditions
        if (conditions.user && context.attributes) {
            return Object.entries(conditions.user).every(([key, expectedValue]) => {
                const actualValue = context.attributes?.[key];
                if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
                    // Check if any of the expected values match any of the actual values
                    return expectedValue.some(val => actualValue.includes(val));
                }
                return actualValue === expectedValue;
            });
        }
        return true;
    }
    /**
     * Get cached evaluation result
     */
    async getCachedEvaluation(flagKey, context) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}eval:${flagKey}:${this.getContextHash(context)}`;
            const cached = await this.redis.get(cacheKey);
            if (cached !== null) {
                return cached === 'true';
            }
        }
        catch (error) {
            this.logger.warn(`Error getting cached evaluation for ${flagKey}:`, error);
        }
        return null;
    }
    /**
     * Cache evaluation result
     */
    async cacheEvaluation(flagKey, context, result) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}eval:${flagKey}:${this.getContextHash(context)}`;
            await this.redis.set(cacheKey, result.toString(), 'EX', this.CACHE_TTL);
        }
        catch (error) {
            this.logger.warn(`Error caching evaluation for ${flagKey}:`, error);
        }
    }
    /**
     * Generate a hash of the context for caching purposes
     */
    getContextHash(context) {
        // Create a hash based on context properties
        const parts = [];
        if (context.userId)
            parts.push(`user:${context.userId}`);
        if (context.groups)
            parts.push(`groups:${context.groups.sort().join(',')}`);
        if (context.attributes) {
            const attrs = Object.entries(context.attributes)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}:${value}`)
                .join('|');
            parts.push(`attrs:${attrs}`);
        }
        // Simple hash algorithm
        let hash = 0;
        const str = parts.join(';');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Get default value for a flag if it doesn't exist
     */
    getDefaultValue(flagKey, fallback) {
        // You could implement logic here based on flag key patterns
        // For example, flags ending in 'disabled' default to false
        if (flagKey.endsWith('.disabled') || flagKey.endsWith('_disabled')) {
            return false;
        }
        if (flagKey.endsWith('.enabled') || flagKey.endsWith('_enabled')) {
            return true;
        }
        return fallback;
    }
    /**
     * Invalidate cache for a specific flag
     */
    async invalidateFlagCache(flagKey) {
        try {
            // Remove from Redis (pattern matching might be needed depending on Redis client)
            // For now, manually construct and remove keys
            this.logger.info(`Invalidating cache for flag: ${flagKey}`);
        }
        catch (error) {
            this.logger.error(`Error invalidating cache for ${flagKey}:`, error);
        }
    }
    /**
     * Get all feature flags with their evaluation status for a context
     */
    async getAllFlagsWithContext(context = {}) {
        const flags = await this.repository.getAllFlags();
        const result = {};
        for (const flag of flags) {
            result[flag.key] = await this.isEnabled(flag.key, context);
        }
        return result;
    }
}
exports.FeatureFlagService = FeatureFlagService;
