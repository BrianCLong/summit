/**
 * Feature Flag Service
 *
 * Provides a unified interface for feature flag management across different providers.
 * Supports LaunchDarkly for production and file-based flags for development.
 *
 * @module services/FeatureFlagService
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';
import { Logger } from '../utils/logger';

/**
 * Feature flag configuration
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
 * User context for feature flag evaluation
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
 * Feature flag value types
 */
export type FlagValue = boolean | string | number | object;

/**
 * Feature flag metadata
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
 * Feature flag evaluation result
 */
export interface FlagEvaluation {
  value: FlagValue;
  reason?: string;
  variationIndex?: number;
}

/**
 * Feature Flag Service
 *
 * Manages feature flags across different providers with fallback support,
 * caching, and comprehensive error handling.
 */
export class FeatureFlagService {
  private provider: 'local' | 'launchdarkly';
  private ldClient?: LaunchDarkly.LDClient;
  private localFlags: Map<string, FlagMetadata> = new Map();
  private cache: Map<string, { value: FlagValue; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache
  private logger: Logger;
  private initialized: boolean = false;
  private initializationPromise?: Promise<void>;

  /**
   * Create a new Feature Flag Service
   *
   * @param config - Feature flag configuration
   * @param logger - Logger instance (optional)
   */
  constructor(
    private config: FeatureFlagConfig,
    logger?: Logger
  ) {
    this.provider = config.provider;
    this.logger = logger || new Logger('FeatureFlagService');
  }

  /**
   * Initialize the feature flag service
   *
   * Sets up the appropriate provider (LaunchDarkly or local file-based)
   * and performs initial validation.
   *
   * @throws {Error} If initialization fails
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
   * Internal initialization method
   *
   * @private
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
    } catch (error) {
      this.logger.error('Failed to initialize feature flag service', error);
      throw new Error(`Feature flag initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize LaunchDarkly provider
   *
   * @private
   * @throws {Error} If SDK key is missing or initialization fails
   */
  private async initializeLaunchDarkly(): Promise<void> {
    const { sdkKey, timeout = 5000 } = this.config.config;

    if (!sdkKey) {
      throw new Error('LaunchDarkly SDK key is required');
    }

    this.logger.info('Initializing LaunchDarkly client...');

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
    } catch (error) {
      this.logger.error('LaunchDarkly client initialization timeout', error);
      throw new Error('LaunchDarkly client failed to initialize within timeout');
    }
  }

  /**
   * Initialize local file-based provider
   *
   * @private
   * @throws {Error} If configuration file cannot be loaded
   */
  private async initializeLocalProvider(): Promise<void> {
    const { file = './config/feature-flags.json' } = this.config.config;

    this.logger.info(`Loading feature flags from file: ${file}`);

    try {
      const configPath = join(process.cwd(), file);
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
    } catch (error) {
      this.logger.error('Failed to load local feature flags', error);
      throw new Error(`Failed to load feature flags from ${file}: ${error.message}`);
    }
  }

  /**
   * Check if a boolean feature flag is enabled
   *
   * @param flagKey - The feature flag key
   * @param user - User context for evaluation
   * @param defaultValue - Default value if flag doesn't exist (default: false)
   * @returns Promise resolving to true if flag is enabled
   *
   * @example
   * ```typescript
   * const isEnabled = await flagService.isEnabled('new-dashboard', {
   *   key: 'user-123',
   *   email: 'user@example.com'
   * });
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
    } catch (error) {
      this.logger.error(`Error checking flag ${flagKey}`, error);
      return defaultValue;
    }
  }

  /**
   * Get feature flag value
   *
   * @param flagKey - The feature flag key
   * @param user - User context for evaluation
   * @param defaultValue - Default value if flag doesn't exist
   * @returns Promise resolving to flag value
   *
   * @example
   * ```typescript
   * const cacheStrategy = await flagService.getValue('cache-strategy', user, 'redis');
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
    } catch (error) {
      this.logger.error(`Error evaluating flag ${flagKey}`, error);
      return defaultValue;
    }
  }

  /**
   * Get JSON feature flag value
   *
   * @param flagKey - The feature flag key
   * @param user - User context for evaluation
   * @param defaultValue - Default JSON value
   * @returns Promise resolving to parsed JSON value
   *
   * @example
   * ```typescript
   * const config = await flagService.getJSONValue('api-rate-limit', user, {
   *   requestsPerMinute: 100,
   *   burstSize: 200
   * });
   * ```
   */
  async getJSONValue<T = any>(
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
      } catch (error) {
        this.logger.warn(`Failed to parse JSON for flag ${flagKey}`, error);
        return defaultValue;
      }
    }

    return defaultValue;
  }

  /**
   * Evaluate flag using LaunchDarkly
   *
   * @private
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
    const ldUser: LaunchDarkly.LDUser = {
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
   * Evaluate flag using local provider
   *
   * @private
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
   * Check if user matches a rollout rule
   *
   * @private
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
   * Simple string hash function for bucketing
   *
   * @private
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
   * Get value from cache if not expired
   *
   * @private
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
   * Set value in cache
   *
   * @private
   */
  private setCache(flagKey: string, value: FlagValue): void {
    this.cache.set(flagKey, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Track flag evaluation for monitoring
   *
   * @private
   */
  private trackFlagEvaluation(flagKey: string, user: FlagUser, value: FlagValue): void {
    // This would integrate with your metrics/monitoring system
    // For example: Prometheus, Datadog, etc.
    this.logger.debug('Flag evaluation', {
      flag: flagKey,
      user: user.key,
      value,
      timestamp: new Date().toISOString(),
    });

    // TODO: Emit metric for monitoring
    // metrics.increment('feature_flag.evaluation', {
    //   flag: flagKey,
    //   value: String(value)
    // });
  }

  /**
   * Get all available feature flags
   *
   * @returns Array of flag metadata
   */
  getAllFlags(): FlagMetadata[] {
    return Array.from(this.localFlags.values());
  }

  /**
   * Get feature flag metadata
   *
   * @param flagKey - The feature flag key
   * @returns Flag metadata or undefined if not found
   */
  getFlagMetadata(flagKey: string): FlagMetadata | undefined {
    return this.localFlags.get(flagKey);
  }

  /**
   * Clear the cache
   *
   * Useful for testing or when you want to force fresh evaluations
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Feature flag cache cleared');
  }

  /**
   * Gracefully shutdown the service
   *
   * Closes LaunchDarkly connection and cleans up resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down feature flag service...');

    if (this.ldClient) {
      try {
        await this.ldClient.close();
        this.logger.info('LaunchDarkly client closed');
      } catch (error) {
        this.logger.error('Error closing LaunchDarkly client', error);
      }
    }

    this.cache.clear();
    this.initialized = false;
  }
}

/**
 * Singleton instance for easy access
 */
let instance: FeatureFlagService | null = null;

/**
 * Get or create feature flag service instance
 *
 * @param config - Feature flag configuration (required on first call)
 * @param logger - Logger instance (optional)
 * @returns Feature flag service instance
 *
 * @example
 * ```typescript
 * // Initialize
 * const flagService = getFeatureFlagService({
 *   provider: 'launchdarkly',
 *   config: { sdkKey: process.env.LD_SDK_KEY }
 * });
 *
 * await flagService.initialize();
 *
 * // Use anywhere in your app
 * const service = getFeatureFlagService();
 * const isEnabled = await service.isEnabled('new-feature', user);
 * ```
 */
export function getFeatureFlagService(
  config?: FeatureFlagConfig,
  logger?: Logger
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
 * Reset singleton instance (useful for testing)
 */
export function resetFeatureFlagService(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}
