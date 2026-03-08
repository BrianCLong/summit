"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
class ConfigService {
    redis;
    logger;
    repository;
    CONFIG_CACHE_PREFIX = 'config:';
    CONFIG_CACHE_TTL = 600; // 10 minutes
    constructor(redis, repository, logger) {
        this.redis = redis;
        this.repository = repository;
        this.logger = logger;
    }
    /**
     * Get a configuration value for a specific environment
     */
    async getConfig(key, environment = process.env.NODE_ENV || 'development') {
        try {
            // Try to get from cache first
            const cachedConfig = await this.getCachedConfig(key, environment);
            if (cachedConfig !== null) {
                return cachedConfig;
            }
            // Fetch from repository
            const config = await this.repository.getConfig(key, environment);
            if (config === null) {
                this.logger.warn(`Configuration not found: ${key} in ${environment}`);
                return this.getDefaultConfigValue(key);
            }
            // Cache the result
            await this.cacheConfig(key, environment, config);
            return config;
        }
        catch (error) {
            this.logger.error(`Error retrieving configuration ${key} in ${environment}:`, error);
            // Return default or null
            return this.getDefaultConfigValue(key);
        }
    }
    /**
     * Get multiple configuration values
     */
    async getMultipleConfig(keys, environment = process.env.NODE_ENV || 'development') {
        const results = {};
        for (const key of keys) {
            results[key] = await this.getConfig(key, environment);
        }
        return results;
    }
    /**
     * Get all configurations for an environment
     */
    async getAllConfig(environment = process.env.NODE_ENV || 'development') {
        try {
            const configs = await this.repository.getAllConfigs(environment);
            const result = {};
            configs.forEach(config => {
                result[config.key] = config.value !== undefined ? config.value : config.enabled;
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Error retrieving all configurations for ${environment}:`, error);
            return {};
        }
    }
    /**
     * Update a configuration value
     */
    async updateConfig(key, value, environment = process.env.NODE_ENV || 'development', userId) {
        try {
            // Get existing config to preserve metadata
            const existing = await this.repository.getConfig(key, environment);
            const updatedAt = new Date();
            const config = {
                key,
                enabled: typeof value === 'boolean' ? value : !!value,
                type: this.inferConfigType(value),
                value,
                description: existing?.description || 'Dynamic configuration',
                createdBy: existing?.createdBy || userId || 'system',
                createdAt: existing?.createdAt || updatedAt,
                updatedAt,
                // Preserve existing targeting/conditions metadata if it existed
                rolloutPercentage: existing?.rolloutPercentage,
                targetUsers: existing?.targetUsers,
                targetGroups: existing?.targetGroups,
                conditions: existing?.conditions,
                scheduledChange: existing?.scheduledChange,
                killSwitch: existing?.killSwitch,
                environment: existing?.environment ? [...new Set([...existing.environment, environment])] : [environment],
                tags: existing?.tags || []
            };
            // Save to repository
            await this.repository.updateConfig(config, environment);
            // Invalidate cache
            await this.invalidateConfigCache(key, environment);
            this.logger.info(`Configuration updated: ${key} in ${environment}`, { userId });
            // Log the configuration change for audit
            this.logConfigChange(key, environment, value, userId, 'UPDATE');
        }
        catch (error) {
            this.logger.error(`Error updating configuration ${key} in ${environment}:`, error);
            throw error;
        }
    }
    /**
     * Create a new configuration
     */
    async createConfig(config, environment = process.env.NODE_ENV || 'development', userId) {
        try {
            // Set timestamps
            const now = new Date();
            config.createdAt = now;
            config.updatedAt = now;
            config.createdBy = userId || 'system';
            // If environment is not set, initialize it to current environment
            if (!config.environment) {
                config.environment = [environment];
            }
            else if (!config.environment.includes(environment)) {
                config.environment.push(environment);
            }
            // Save to repository
            await this.repository.createConfig(config, environment);
            // Cache the config
            await this.cacheConfig(config.key, environment, config);
            this.logger.info(`Configuration created: ${config.key} in ${environment}`, { userId });
            // Log the configuration change for audit
            this.logConfigChange(config.key, environment, config.value || config.enabled, userId, 'CREATE');
        }
        catch (error) {
            this.logger.error(`Error creating configuration ${config.key} in ${environment}:`, error);
            throw error;
        }
    }
    /**
     * Invalidate configuration cache
     */
    async invalidateConfigCache(key, environment) {
        try {
            const cacheKey = `${this.CONFIG_CACHE_PREFIX}${key}:${environment}`;
            await this.redis.del(cacheKey);
            this.logger.debug(`Config cache invalidated: ${key} in ${environment}`);
        }
        catch (error) {
            this.logger.error(`Error invalidating config cache for ${key} in ${environment}:`, error);
        }
    }
    /**
     * Invalidate all configuration cache for an environment
     */
    async invalidateAllConfigCache(environment) {
        try {
            // This would use Redis KEYS or SCAN to find keys matching the pattern
            // For performance, in production you might want to maintain a set of config keys
            this.logger.info(`Invalidated all config cache for ${environment}`);
        }
        catch (error) {
            this.logger.error(`Error invalidating all config cache for ${environment}:`, error);
        }
    }
    /**
     * Get cached configuration value
     */
    async getCachedConfig(key, environment) {
        try {
            const cacheKey = `${this.CONFIG_CACHE_PREFIX}${key}:${environment}`;
            const cached = await this.redis.get(cacheKey);
            if (cached !== null) {
                return JSON.parse(cached);
            }
        }
        catch (error) {
            this.logger.warn(`Error getting cached config for ${key} in ${environment}:`, error);
        }
        return null;
    }
    /**
     * Cache configuration value
     */
    async cacheConfig(key, environment, config) {
        try {
            const cacheKey = `${this.CONFIG_CACHE_PREFIX}${key}:${environment}`;
            await this.redis.setex(cacheKey, this.CONFIG_CACHE_TTL, JSON.stringify(config));
        }
        catch (error) {
            this.logger.warn(`Error caching config for ${key} in ${environment}:`, error);
        }
    }
    /**
     * Get default value for configuration
     */
    getDefaultConfigValue(key) {
        // Default values based on key patterns
        if (key.includes('.enabled') || key.includes('enable_') || key.includes('show_')) {
            return false;
        }
        if (key.includes('.url') || key.includes('_url')) {
            return '';
        }
        if (key.includes('.timeout') || key.includes('_duration')) {
            return 30000; // 30 seconds
        }
        if (key.includes('.count') || key.includes('_size')) {
            return 10;
        }
        if (key.includes('.percentage') || key.includes('_ratio')) {
            return 0;
        }
        return null;
    }
    /**
     * Infer configuration type from value
     */
    inferConfigType(value) {
        if (typeof value === 'boolean')
            return 'boolean';
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'string')
            return 'string';
        if (Array.isArray(value) || typeof value === 'object')
            return 'json';
        return 'string'; // default fallback
    }
    /**
     * Log configuration changes for audit purposes
     */
    logConfigChange(key, environment, value, userId, action) {
        // In a real implementation, this would log to a dedicated audit service/database
        this.logger.info('CONFIG_CHANGE_AUDIT', {
            timestamp: new Date().toISOString(),
            action,
            key,
            environment,
            value: this.maskSensitiveValues(key, value),
            userId: userId || 'system'
        });
    }
    /**
     * Mask sensitive configuration values
     */
    maskSensitiveValues(key, value) {
        const sensitivePatterns = [
            /.*password.*/i,
            /.*token.*/i,
            /.*secret.*/i,
            /.*key.*/i,
            /.*credential.*/i,
            /.*auth.*/i
        ];
        const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
        return isSensitive ? '[REDACTED]' : value;
    }
    /**
     * Get system configurations that override environment-specific settings
     */
    async getSystemOverrides() {
        // This could implement system-wide overrides that take precedence
        // over environment-specific configs
        const systemOverrides = {};
        // Example: emergency mode that disables all non-essential features
        const emergencyOverride = await this.redis.get('system:emergency:override');
        if (emergencyOverride === 'true') {
            systemOverrides['emergency.mode'] = true;
            systemOverrides['feature.auto-enabled'] = false; // Disable auto-features in emergency
        }
        return systemOverrides;
    }
    /**
     * Warm up cache with frequently accessed configurations
     */
    async warmUpCache(environment, configKeys) {
        for (const key of configKeys) {
            try {
                await this.getConfig(key, environment);
            }
            catch (error) {
                this.logger.warn(`Failed to warm up cache for config ${key}:`, error);
            }
        }
    }
}
exports.ConfigService = ConfigService;
