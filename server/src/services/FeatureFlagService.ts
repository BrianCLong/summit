/**
 * @file Provides a unified interface for feature flag management.
 * @module services/FeatureFlagService
 * @deprecated Use '@intelgraph/feature-flags' instead. See server/src/feature-flags/setup.ts
 */

import { readFileSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import logger from '../utils/logger.js';

/**
 * @interface FeatureFlagConfig
 * @description Configuration for the FeatureFlagService, specifying the provider and its settings.
 * @property {'local' | 'launchdarkly'} provider - The feature flag provider to use.
 * @property {object} config - Provider-specific configuration.
 * @property {string} [config.sdkKey] - SDK key for LaunchDarkly.
 * @property {number} [config.timeout] - Initialization timeout in milliseconds.
 * @property {string} [config.file] - Path to a local JSON file for the 'local' provider.
 */
export interface FeatureFlagConfig {
  provider: 'local' | 'launchdarkly';
  config: {
    sdkKey?: string;
    timeout?: number;
    file?: string;
    [key: string]: any;
  };
}

/**
 * @interface FlagUser
 * @description Represents the user context for evaluating a feature flag.
 * @property {string} key - A unique identifier for the user.
 * @property {string} [email] - The user's email address.
 * @property {string} [name] - The user's name.
 * @property {string} [organization] - The organization the user belongs to.
 * @property {string} [userRole] - The user's role.
 * @property {Record<string, any>} [custom] - A map for any other custom attributes.
 */
export interface FlagUser {
  key: string;
  email?: string;
  name?: string;
  organization?: string;
  userRole?: string;
  custom?: Record<string, any>;
}

/**
 * @typedef FlagValue
 * @description Represents the possible value types of a feature flag.
 */
export type FlagValue = boolean | string | number | object;

/**
 * @interface FlagMetadata
 * @description Contains descriptive metadata about a feature flag.
 * @property {string} key - The unique key for the flag.
 * @property {string} name - A human-readable name for the flag.
 * @property {string} [description] - A description of what the flag controls.
 * @property {'boolean' | 'string' | 'number' | 'json'} type - The data type of the flag's value.
 * @property {FlagValue} defaultValue - The default value of the flag if evaluation fails or no rule matches.
 * @property {string[]} [tags] - Tags for organizing and categorizing flags.
 */
export interface FlagMetadata {
  key: string;
  name: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: FlagValue;
  tags?: string[];
}

/**
 * @interface FlagEvaluation
 * @description Represents the detailed result of a feature flag evaluation.
 * @property {FlagValue} value - The evaluated value of the flag.
 * @property {string} [reason] - An explanation of how the value was determined (e.g., 'TARGET_MATCH').
 * @property {number} [variationIndex] - The index of the variation that was served.
 */
export interface FlagEvaluation {
  value: FlagValue;
  reason?: string;
  variationIndex?: number;
}

/**
 * @class FeatureFlagService
 * @description Manages feature flags, supporting different providers like LaunchDarkly or a local file.
 * It includes caching, fallback mechanisms, and robust error handling.
 */
export class FeatureFlagService {
  private provider: 'local' | 'launchdarkly';
  private ldClient?: any;
  private localFlags: Map<string, FlagMetadata> = new Map();
  private cache: Map<string, { value: FlagValue; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache
  private logger: any;
  private initialized: boolean = false;
  private initializationPromise?: Promise<void>;

  /**
   * @constructor
   * @description Creates an instance of the FeatureFlagService.
   * @param {FeatureFlagConfig} config - The configuration for the service.
   * @param {any} [injectedLogger] - An optional logger instance.
   */
  constructor(
    private config: FeatureFlagConfig,
    injectedLogger?: any
  ) {
    this.provider = config.provider;
    const baseLogger =
      injectedLogger ||
      (logger && typeof (logger as any).child === 'function'
        ? logger.child({ service: 'FeatureFlagService' })
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
  async initialize(): Promise<void> {
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
  private async _initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing feature flag service with provider: ${this.provider}`);

      if (this.provider === 'launchdarkly') {
        await this.initializeLaunchDarkly();
      } else {
        await this.initializeLocalProvider();
      }

      this.initialized = true;
      this.logger.info('Feature flag service initialized successfully');
    } catch (error: any) {
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
  private async initializeLaunchDarkly(): Promise<void> {
    const { sdkKey, timeout = 5000 } = this.config.config;

    if (!sdkKey) {
      throw new Error('LaunchDarkly SDK key is required');
    }

    this.logger.info('Initializing LaunchDarkly client...');

    // LaunchDarkly is optional - only initialize if available
    try {
      const LaunchDarkly = await import('launchdarkly-node-server-sdk');

      // Create LaunchDarkly client with configuration
      this.ldClient = LaunchDarkly.init(sdkKey, {
        timeout: timeout / 1000, // Convert to seconds
        logger: LaunchDarkly.basicLogger({
          level: 'info',
          destination: (line: string) => this.logger.debug(`[LaunchDarkly] ${line}`),
        }),
      });

      // Wait for client to be ready
      try {
        await this.ldClient.waitForInitialization({ timeout });
        this.logger.info('LaunchDarkly client initialized successfully');
      } catch (error: any) {
        this.logger.error('LaunchDarkly client initialization timeout', error);
        throw new Error('LaunchDarkly client failed to initialize within timeout');
      }
    } catch (error: any) {
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
  private async initializeLocalProvider(): Promise<void> {
    const { file = './config/feature-flags.json' } = this.config.config;

    this.logger.info(`Loading feature flags from file: ${file}`);

    try {
      const configPath = isAbsolute(file) ? file : resolve(process.cwd(), file);
      const configData = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // Load flags from configuration
      if (config.flags) {
        Object.values(config.flags).forEach((flag: any) => {
          this.localFlags.set(flag.key, flag);
        });
      }

      // Load kill switches
      if (config.killSwitches) {
        Object.values(config.killSwitches).forEach((flag: any) => {
          this.localFlags.set(flag.key, {
            ...flag,
            type: 'boolean',
            tags: [...(flag.tags || []), 'kill-switch'],
          });
        });
      }

      this.logger.info(`Loaded ${this.localFlags.size} feature flags from local file`);
    } catch (error: any) {
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
  async isEnabled(
    flagKey: string,
    user: FlagUser,
    defaultValue: boolean = false
  ): Promise<boolean> {
    try {
      const value = await this.getValue(flagKey, user, defaultValue);
      return Boolean(value);
    } catch (error: any) {
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
  async getValue<T extends FlagValue = FlagValue>(
    flagKey: string,
    user: FlagUser,
    defaultValue: T
  ): Promise<T> {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache
    const cached = this.getFromCache(flagKey);
    if (cached !== null) {
      this.logger.debug(`Returning cached value for flag ${flagKey}`);
      return cached as T;
    }

    try {
      let value: FlagValue;

      if (this.provider === 'launchdarkly' && this.ldClient) {
        value = await this.evaluateLaunchDarklyFlag(flagKey, user, defaultValue);
      } else {
        value = this.evaluateLocalFlag(flagKey, user, defaultValue);
      }

      // Cache the result
      this.setCache(flagKey, value);

      // Track flag evaluation (for monitoring)
      this.trackFlagEvaluation(flagKey, user, value);

      return value as T;
    } catch (error: any) {
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
  async getJSONValue<T extends FlagValue = any>(
    flagKey: string,
    user: FlagUser,
    defaultValue: T
  ): Promise<T> {
    const value = await this.getValue(flagKey, user, defaultValue);

    // If value is already an object, return it
    if (typeof value === 'object' && value !== null) {
      return value as T;
    }

    // If value is a string, try to parse it
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error: any) {
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
  private async evaluateLaunchDarklyFlag<T extends FlagValue>(
    flagKey: string,
    user: FlagUser,
    defaultValue: T
  ): Promise<T> {
    if (!this.ldClient) {
      throw new Error('LaunchDarkly client not initialized');
    }

    // Convert user to LaunchDarkly format
    const ldUser: any = {
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
    const flagType = flagMetadata?.type || (typeof defaultValue as string);

    let value: FlagValue;

    switch (flagType) {
      case 'boolean':
        value = await this.ldClient.variation(flagKey, ldUser, defaultValue as boolean);
        break;
      case 'string':
        value = await this.ldClient.variation(flagKey, ldUser, defaultValue as string);
        break;
      case 'number':
        value = await this.ldClient.variation(flagKey, ldUser, defaultValue as number);
        break;
      case 'json':
      case 'object':
        value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
        break;
      default:
        value = await this.ldClient.variation(flagKey, ldUser, defaultValue);
    }

    return value as T;
  }

  /**
   * @private
   * @method evaluateLocalFlag
   * @description Evaluates a flag using the local file provider, including rollout rules.
   * @template T
   */
  private evaluateLocalFlag<T extends FlagValue>(
    flagKey: string,
    user: FlagUser,
    defaultValue: T
  ): T {
    const flag = this.localFlags.get(flagKey);

    if (!flag) {
      this.logger.debug(`Flag ${flagKey} not found, using default value`);
      return defaultValue;
    }

    // Check if flag has rollout rules
    const rollout = (flag as any).rollout;

    if (rollout) {
      // Handle targeted rollout
      if (rollout.type === 'targeted' && rollout.rules) {
        for (const rule of rollout.rules) {
          if (this.matchesRule(user, rule)) {
            return flag.defaultValue as T;
          }
        }
        return defaultValue;
      }

      // Handle gradual rollout
      if (rollout.type === 'gradual' && rollout.percentage !== undefined) {
        const hash = this.hashString(user.key);
        const bucket = hash % 100;

        if (bucket < rollout.percentage) {
          return flag.defaultValue as T;
        }
        return defaultValue;
      }
    }

    // No rollout rules, return default flag value
    return flag.defaultValue as T;
  }

  /**
   * @private
   * @method matchesRule
   * @description Checks if a user's context matches a specific targeting rule.
   * @param {FlagUser} user - The user context.
   * @param {any} rule - The rule to evaluate against.
   * @returns {boolean} `true` if the user matches the rule.
   */
  private matchesRule(user: FlagUser, rule: any): boolean {
    const { attribute, operator, values } = rule;

    let userValue: any;

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
  private hashString(str: string): number {
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
  private getFromCache(flagKey: string): FlagValue | null {
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
  private setCache(flagKey: string, value: FlagValue): void {
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
  private trackFlagEvaluation(flagKey: string, user: FlagUser, value: FlagValue): void {
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
  getAllFlags(): FlagMetadata[] {
    return Array.from(this.localFlags.values());
  }

  /**
   * @method getFlagMetadata
   * @description Retrieves metadata for a specific feature flag.
   * @param {string} flagKey - The key of the flag.
   * @returns {FlagMetadata | undefined} The flag's metadata or undefined if not found.
   */
  getFlagMetadata(flagKey: string): FlagMetadata | undefined {
    return this.localFlags.get(flagKey);
  }

  /**
   * @method clearCache
   * @description Clears the in-memory cache of flag evaluations.
   * Useful for testing or forcing fresh evaluations.
   */
  clearCache(): void {
    this.cache.clear();
    const log = this.logger ?? console;
    log.info('Feature flag cache cleared');
  }

  /**
   * @method shutdown
   * @description Gracefully shuts down the service, closing any active connections.
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    const log = this.logger ?? console;
    log.info('Shutting down feature flag service...');

    if (this.ldClient) {
      try {
        await this.ldClient.close();
        log.info('LaunchDarkly client closed');
      } catch (error: any) {
        log.error('Error closing LaunchDarkly client', error);
      }
    }

    this.cache.clear();
    this.initialized = false;
  }
}

/**
 * @const {FeatureFlagService | null} instance
 * @description The singleton instance of the FeatureFlagService.
 * @private
 */
let instance: FeatureFlagService | null = null;

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
export function getFeatureFlagService(
  config?: FeatureFlagConfig,
  logger?: any
): FeatureFlagService {
  if (!instance && !config) {
    throw new Error('Feature flag service not initialized. Provide config on first call.');
  }

  if (config && !instance) {
    instance = new FeatureFlagService(config, logger);
  }

  return instance!;
}

/**
 * @function resetFeatureFlagService
 * @description Resets the singleton instance of the service.
 * Primarily useful for testing purposes to ensure a clean state between tests.
 */
export function resetFeatureFlagService(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}
