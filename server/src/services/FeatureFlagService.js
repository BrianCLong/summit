"use strict";
/**
 * @file Provides a unified interface for feature flag management.
 * @module services/FeatureFlagService
 * @deprecated Use '@intelgraph/feature-flags' instead. See server/src/feature-flags/setup.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagService = void 0;
exports.getFeatureFlagService = getFeatureFlagService;
exports.resetFeatureFlagService = resetFeatureFlagService;
const fs_1 = require("fs");
const path_1 = require("path");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * @class FeatureFlagService
 * @description Manages feature flags, supporting different providers like LaunchDarkly or a local file.
 * It includes caching, fallback mechanisms, and robust error handling.
 */
class FeatureFlagService {
    config;
    provider;
    ldClient;
    localFlags = new Map();
    cache = new Map();
    cacheTimeout = 60000; // 1 minute cache
    logger;
    initialized = false;
    initializationPromise;
    /**
     * @constructor
     * @description Creates an instance of the FeatureFlagService.
     * @param {FeatureFlagConfig} config - The configuration for the service.
     * @param {any} [injectedLogger] - An optional logger instance.
     */
    constructor(config, injectedLogger) {
        this.config = config;
        this.provider = config.provider;
        const baseLogger = injectedLogger ||
            (logger_js_1.default && typeof logger_js_1.default.child === 'function'
                ? logger_js_1.default.child({ service: 'FeatureFlagService' })
                : console);
        this.logger = baseLogger;
    }
    /**
     * @method initialize
     * @description Initializes the feature flag service by setting up the configured provider.
     * This method is idempotent and safe to call multiple times.
     * @returns {Promise<void>}
     * @throws {Error} If initialization of the provider fails.
     */
    async initialize() {
        // Return existing initialization promise if already initializing
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        // Return immediately if already initialized
        if (this.initialized) {
            return Promise.resolve();
        }
        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }
    /**
     * @private
     * @method _initialize
     * @description The internal implementation of the initialization logic.
     */
    async _initialize() {
        try {
            this.logger.info(`Initializing feature flag service with provider: ${this.provider}`);
            if (this.provider === 'launchdarkly') {
                await this.initializeLaunchDarkly();
            }
            else {
                await this.initializeLocalProvider();
            }
            this.initialized = true;
            this.logger.info('Feature flag service initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize feature flag service', error);
            throw new Error(`Feature flag initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * @private
     * @method initializeLaunchDarkly
     * @description Sets up the LaunchDarkly SDK client.
     * @throws {Error} If the SDK key is missing or the client fails to initialize.
     */
    async initializeLaunchDarkly() {
        const { sdkKey, timeout = 5000 } = this.config.config;
        if (!sdkKey) {
            throw new Error('LaunchDarkly SDK key is required');
        }
        this.logger.info('Initializing LaunchDarkly client...');
        // LaunchDarkly is optional - only initialize if available
        try {
            const LaunchDarkly = await Promise.resolve().then(() => __importStar(require('launchdarkly-node-server-sdk')));
            // Create LaunchDarkly client with configuration
            this.ldClient = LaunchDarkly.init(sdkKey, {
                timeout: timeout / 1000, // Convert to seconds
                logger: LaunchDarkly.basicLogger({
                    level: 'info',
                    destination: (line) => this.logger.debug(`[LaunchDarkly] ${line}`),
                }),
            });
            // Wait for client to be ready
            try {
                await this.ldClient.waitForInitialization({ timeout });
                this.logger.info('LaunchDarkly client initialized successfully');
            }
            catch (error) {
                this.logger.error('LaunchDarkly client initialization timeout', error);
                throw new Error('LaunchDarkly client failed to initialize within timeout');
            }
        }
        catch (error) {
            this.logger.warn('LaunchDarkly SDK not available, falling back to local provider');
            throw error;
        }
    }
    /**
     * @private
     * @method initializeLocalProvider
     * @description Loads feature flags from a local JSON file.
     * @throws {Error} If the configuration file cannot be read or parsed.
     */
    async initializeLocalProvider() {
        const { file = './config/feature-flags.json' } = this.config.config;
        this.logger.info(`Loading feature flags from file: ${file}`);
        try {
            const configPath = (0, path_1.isAbsolute)(file) ? file : (0, path_1.resolve)(process.cwd(), file);
            const configData = (0, fs_1.readFileSync)(configPath, 'utf-8');
            const config = JSON.parse(configData);
            // Load flags from configuration
            if (config.flags) {
                Object.values(config.flags).forEach((flag) => {
                    this.localFlags.set(flag.key, flag);
                });
            }
            // Load kill switches
            if (config.killSwitches) {
                Object.values(config.killSwitches).forEach((flag) => {
                    this.localFlags.set(flag.key, {
                        ...flag,
                        type: 'boolean',
                        tags: [...(flag.tags || []), 'kill-switch'],
                    });
                });
            }
            this.logger.info(`Loaded ${this.localFlags.size} feature flags from local file`);
        }
        catch (error) {
            this.logger.error('Failed to load local feature flags', error);
            throw new Error(`Failed to load feature flags from ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * @method isEnabled
     * @description Checks if a boolean feature flag is enabled for a given user context.
     * @param {string} flagKey - The key of the feature flag to check.
     * @param {FlagUser} user - The user context for evaluation.
     * @param {boolean} [defaultValue=false] - The default value to return if the flag cannot be evaluated.
     * @returns {Promise<boolean>} `true` if the flag is enabled, otherwise `false`.
     *
     * @example
     * ```typescript
     * const isEnabled = await flagService.isEnabled('new-dashboard', { key: 'user-123' });
     * ```
     */
    async isEnabled(flagKey, user, defaultValue = false) {
        try {
            const value = await this.getValue(flagKey, user, defaultValue);
            return Boolean(value);
        }
        catch (error) {
            this.logger.error(`Error checking flag ${flagKey}`, error);
            return defaultValue;
        }
    }
    /**
     * @method getValue
     * @description Retrieves the value of a feature flag for a given user context.
     * It handles caching, provider-specific evaluation, and fallbacks to a default value.
     * @template T
     * @param {string} flagKey - The key of the feature flag.
     * @param {FlagUser} user - The user context for evaluation.
     * @param {T} defaultValue - The default value to return if the flag cannot be evaluated.
     * @returns {Promise<T>} The evaluated value of the flag.
     *
     * @example
     * ```typescript
     * const theme = await flagService.getValue('ui-theme', { key: 'user-123' }, 'light');
     * ```
     */
    async getValue(flagKey, user, defaultValue) {
        // Ensure service is initialized
        if (!this.initialized) {
            await this.initialize();
        }
        // Check cache
        const cached = this.getFromCache(flagKey);
        if (cached !== null) {
            this.logger.debug(`Returning cached value for flag ${flagKey}`);
            return cached;
        }
        try {
            let value;
            if (this.provider === 'launchdarkly' && this.ldClient) {
                value = await this.evaluateLaunchDarklyFlag(flagKey, user, defaultValue);
            }
            else {
                value = this.evaluateLocalFlag(flagKey, user, defaultValue);
            }
            // Cache the result
            this.setCache(flagKey, value);
            // Track flag evaluation (for monitoring)
            this.trackFlagEvaluation(flagKey, user, value);
            return value;
        }
        catch (error) {
            this.logger.error(`Error evaluating flag ${flagKey}`, error);
            return defaultValue;
        }
    }
    /**
     * @method getJSONValue
     * @description Retrieves a JSON feature flag value and parses it into an object.
     * @template T
     * @param {string} flagKey - The key of the JSON feature flag.
     * @param {FlagUser} user - The user context for evaluation.
     * @param {T} defaultValue - The default object to return on failure.
     * @returns {Promise<T>} The parsed JSON object from the flag's value.
     *
     * @example
     * ```typescript
     * const config = await flagService.getJSONValue('api-config', { key: 'user-123' }, { retries: 3 });
     * ```
     */
    async getJSONValue(flagKey, user, defaultValue) {
        const value = await this.getValue(flagKey, user, defaultValue);
        // If value is already an object, return it
        if (typeof value === 'object' && value !== null) {
            return value;
        }
        // If value is a string, try to parse it
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch (error) {
                this.logger.warn(`Failed to parse JSON for flag ${flagKey}`, error);
                return defaultValue;
            }
        }
        return defaultValue;
    }
    /**
     * @private
     * @method evaluateLaunchDarklyFlag
     * @description Evaluates a flag using the LaunchDarkly SDK.
     * @template T
     */
    async evaluateLaunchDarklyFlag(flagKey, user, defaultValue) {
        if (!this.ldClient) {
            throw new Error('LaunchDarkly client not initialized');
        }
        // Convert user to LaunchDarkly format
        const ldUser = {
            key: user.key,
            email: user.email,
            name: user.name,
            custom: {
                organization: user.organization,
                userRole: user.userRole,
                ...user.custom,
            },
        };
        // Evaluate flag based on type
        const flagMetadata = this.localFlags.get(flagKey);
        const flagType = flagMetadata?.type || typeof defaultValue;
        let value;
        switch (flagType) {
            case 'boolean':
                value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
                break;
            case 'string':
                value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
                break;
            case 'number':
                value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
                break;
            case 'json':
            case 'object':
                value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
                break;
            default:
                value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
        }
        return value;
    }
    /**
     * @private
     * @method evaluateLocalFlag
     * @description Evaluates a flag using the local file provider, including rollout rules.
     * @template T
     */
    evaluateLocalFlag(flagKey, user, defaultValue) {
        const flag = this.localFlags.get(flagKey);
        if (!flag) {
            this.logger.debug(`Flag ${flagKey} not found, using default value`);
            return defaultValue;
        }
        // Check if flag has rollout rules
        const rollout = flag.rollout;
        if (rollout) {
            // Handle targeted rollout
            if (rollout.type === 'targeted' && rollout.rules) {
                for (const rule of rollout.rules) {
                    if (this.matchesRule(user, rule)) {
                        return flag.defaultValue;
                    }
                }
                return defaultValue;
            }
            // Handle gradual rollout
            if (rollout.type === 'gradual' && rollout.percentage !== undefined) {
                const hash = this.hashString(user.key);
                const bucket = hash % 100;
                if (bucket < rollout.percentage) {
                    return flag.defaultValue;
                }
                return defaultValue;
            }
        }
        // No rollout rules, return default flag value
        return flag.defaultValue;
    }
    /**
     * @private
     * @method matchesRule
     * @description Checks if a user's context matches a specific targeting rule.
     * @param {FlagUser} user - The user context.
     * @param {any} rule - The rule to evaluate against.
     * @returns {boolean} `true` if the user matches the rule.
     */
    matchesRule(user, rule) {
        const { attribute, operator, values } = rule;
        let userValue;
        // Get user attribute value
        switch (attribute) {
            case 'email':
                userValue = user.email;
                break;
            case 'organization':
                userValue = user.organization;
                break;
            case 'userRole':
                userValue = user.userRole;
                break;
            default:
                userValue = user.custom?.[attribute];
        }
        if (userValue === undefined) {
            return false;
        }
        // Apply operator
        switch (operator) {
            case 'in':
                return values.includes(userValue);
            case 'not_in':
                return !values.includes(userValue);
            case 'equals':
                return userValue === values[0];
            case 'contains':
                return String(userValue).includes(values[0]);
            default:
                return false;
        }
    }
    /**
     * @private
     * @method hashString
     * @description A simple string hashing function used for bucketing users in gradual rollouts.
     * @param {string} str - The string to hash.
     * @returns {number} An integer hash value.
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    /**
     * @private
     * @method getFromCache
     * @description Retrieves a value from the cache if it exists and has not expired.
     * @param {string} flagKey - The key of the flag to retrieve.
     * @returns {FlagValue | null} The cached value or null.
     */
    getFromCache(flagKey) {
        const cached = this.cache.get(flagKey);
        if (!cached) {
            return null;
        }
        const now = Date.now();
        const age = now - cached.timestamp;
        if (age > this.cacheTimeout) {
            this.cache.delete(flagKey);
            return null;
        }
        return cached.value;
    }
    /**
     * @private
     * @method setCache
     * @description Stores a flag's evaluated value in the cache.
     * @param {string} flagKey - The key of the flag.
     * @param {FlagValue} value - The value to cache.
     */
    setCache(flagKey, value) {
        this.cache.set(flagKey, {
            value,
            timestamp: Date.now(),
        });
    }
    /**
     * @private
     * @method trackFlagEvaluation
     * @description A placeholder for tracking flag evaluations for monitoring and analytics.
     * @param {string} flagKey - The key of the evaluated flag.
     * @param {FlagUser} user - The user context.
     * @param {FlagValue} value - The resulting value.
     */
    trackFlagEvaluation(flagKey, user, value) {
        this.logger.debug('Flag evaluation', {
            flag: flagKey,
            user: user.key,
            value,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * @method getAllFlags
     * @description Retrieves metadata for all feature flags loaded by the service.
     * @returns {FlagMetadata[]} An array of flag metadata.
     */
    getAllFlags() {
        return Array.from(this.localFlags.values());
    }
    /**
     * @method getFlagMetadata
     * @description Retrieves metadata for a specific feature flag.
     * @param {string} flagKey - The key of the flag.
     * @returns {FlagMetadata | undefined} The flag's metadata or undefined if not found.
     */
    getFlagMetadata(flagKey) {
        return this.localFlags.get(flagKey);
    }
    /**
     * @method clearCache
     * @description Clears the in-memory cache of flag evaluations.
     * Useful for testing or forcing fresh evaluations.
     */
    clearCache() {
        this.cache.clear();
        const log = this.logger ?? console;
        log.info('Feature flag cache cleared');
    }
    /**
     * @method shutdown
     * @description Gracefully shuts down the service, closing any active connections.
     * @returns {Promise<void>}
     */
    async shutdown() {
        const log = this.logger ?? console;
        log.info('Shutting down feature flag service...');
        if (this.ldClient) {
            try {
                await this.ldClient.close();
                log.info('LaunchDarkly client closed');
            }
            catch (error) {
                log.error('Error closing LaunchDarkly client', error);
            }
        }
        this.cache.clear();
        this.initialized = false;
    }
}
exports.FeatureFlagService = FeatureFlagService;
/**
 * @const {FeatureFlagService | null} instance
 * @description The singleton instance of the FeatureFlagService.
 * @private
 */
let instance = null;
/**
 * @function getFeatureFlagService
 * @description Gets the singleton instance of the FeatureFlagService.
 * The configuration must be provided on the first call to initialize the service.
 * @param {FeatureFlagConfig} [config] - The configuration, required on first call.
 * @param {any} [logger] - An optional logger instance.
 * @returns {FeatureFlagService} The singleton instance.
 * @throws {Error} If called without configuration before the service is initialized.
 *
 * @example
 * ```typescript
 * // In your main application file
 * const flagService = getFeatureFlagService({ provider: 'local' });
 * await flagService.initialize();
 *
 * // In another file
 * const service = getFeatureFlagService();
 * ```
 */
function getFeatureFlagService(config, logger) {
    if (!instance && !config) {
        throw new Error('Feature flag service not initialized. Provide config on first call.');
    }
    if (config && !instance) {
        instance = new FeatureFlagService(config, logger);
    }
    return instance;
}
/**
 * @function resetFeatureFlagService
 * @description Resets the singleton instance of the service.
 * Primarily useful for testing purposes to ensure a clean state between tests.
 */
function resetFeatureFlagService() {
    if (instance) {
        instance.shutdown();
        instance = null;
    }
}
