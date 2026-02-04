/**
 * Unleash Provider
 *
 * Unleash integration for feature flags
 */

import { Unleash, UnleashConfig, Context as UnleashContext } from 'unleash-client';
import type {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluation,
  FlagDefinition,
  EvaluationReason,
} from '../types.js';

/**
 * Unleash provider configuration
 */
export interface UnleashProviderConfig {
  /** Unleash URL */
  url: string;
  /** Application name */
  appName: string;
  /** Instance ID */
  instanceId?: string;
  /** API token */
  apiToken?: string;
  /** Custom headers */
  customHeaders?: Record<string, string>;
  /** Additional Unleash config */
  unleashConfig?: Partial<UnleashConfig>;
}

/**
 * Unleash feature flag provider
 */
export class UnleashProvider implements FeatureFlagProvider {
  readonly name = 'Unleash';
  private unleash: Unleash;
  private ready = false;
  private config: UnleashProviderConfig;

  constructor(config: UnleashProviderConfig) {
    this.config = config;

    const unleashConfig: UnleashConfig = {
      url: config.url,
      appName: config.appName,
      instanceId: config.instanceId,
      customHeaders: {
        ...(config.apiToken ? { Authorization: config.apiToken } : {}),
        ...config.customHeaders,
      },
      ...config.unleashConfig,
    };

    this.unleash = new Unleash(unleashConfig);
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
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
  async close(): Promise<void> {
    this.unleash.destroy();
    this.ready = false;
  }

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Evaluate a boolean flag
   */
  async getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context: FlagContext,
  ): Promise<FlagEvaluation<boolean>> {
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
  async getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>> {
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
  async getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>> {
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
  async getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>> {
    const unleashContext = this.buildUnleashContext(context);
    const variant = this.unleash.getVariant(key, unleashContext);

    let value = defaultValue;
    if (variant?.enabled && variant.payload?.value) {
      try {
        value = JSON.parse(variant.payload.value);
      } catch {
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
  async getAllFlags(
    context: FlagContext,
  ): Promise<Record<string, FlagEvaluation>> {
    // Unleash doesn't provide a built-in method to get all flags
    // This would require tracking all flag keys separately
    return {};
  }

  /**
   * Get flag definition
   */
  async getFlagDefinition(key: string): Promise<FlagDefinition | null> {
    // Unleash SDK doesn't provide full flag metadata
    // This would require using the Unleash Admin API
    return null;
  }

  /**
   * List all flags
   */
  async listFlags(): Promise<FlagDefinition[]> {
    // Unleash SDK doesn't provide full flag metadata
    // This would require using the Unleash Admin API
    return [];
  }

  /**
   * Track an event/metric
   */
  async track(
    eventName: string,
    context: FlagContext,
    data?: Record<string, any>,
  ): Promise<void> {
    // Unleash doesn't have built-in custom event tracking
    // Events would need to be sent to a separate analytics service
  }

  /**
   * Build Unleash context from flag context
   */
  private buildUnleashContext(context: FlagContext): UnleashContext {
    const unleashContext: UnleashContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      remoteAddress: context.ipAddress,
      properties: {},
    };

    if (context.userEmail) {
      unleashContext.properties!.email = context.userEmail;
    }

    if (context.tenantId) {
      unleashContext.properties!.tenantId = context.tenantId;
    }

    if (context.environment) {
      unleashContext.environment = context.environment;
    }

    if (context.userRole) {
      unleashContext.properties!.role = Array.isArray(context.userRole)
        ? context.userRole.join(',')
        : context.userRole;
    }

    if (context.location) {
      if (context.location.country) {
        unleashContext.properties!.country = context.location.country;
      }
      if (context.location.region) {
        unleashContext.properties!.region = context.location.region;
      }
      if (context.location.city) {
        unleashContext.properties!.city = context.location.city;
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
  private determineReason(enabled: boolean): EvaluationReason {
    return enabled ? 'RULE_MATCH' : 'DEFAULT';
  }
}
