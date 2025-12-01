/**
 * LaunchDarkly Provider
 *
 * LaunchDarkly integration for feature flags
 */

import * as ld from 'launchdarkly-node-server-sdk';
import type {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluation,
  FlagDefinition,
  EvaluationReason,
} from '../types.js';

/**
 * LaunchDarkly provider configuration
 */
export interface LaunchDarklyConfig {
  /** LaunchDarkly SDK key */
  sdkKey: string;
  /** Client options */
  options?: ld.LDOptions;
  /** Timeout for initialization */
  timeout?: number;
}

/**
 * LaunchDarkly feature flag provider
 */
export class LaunchDarklyProvider implements FeatureFlagProvider {
  readonly name = 'LaunchDarkly';
  private client: ld.LDClient;
  private ready = false;
  private timeout: number;

  constructor(private config: LaunchDarklyConfig) {
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
  async initialize(): Promise<void> {
    try {
      await this.client.waitForInitialization({ timeout: this.timeout / 1000 });
      this.ready = true;
    } catch (error) {
      throw new Error(
        `LaunchDarkly initialization failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Shutdown the provider
   */
  async close(): Promise<void> {
    await this.client.close();
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
    const ldContext = this.buildLDContext(context);
    const detail = await this.client.booleanVariationDetail(
      key,
      ldContext,
      defaultValue,
    );

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
  async getStringFlag(
    key: string,
    defaultValue: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<string>> {
    const ldContext = this.buildLDContext(context);
    const detail = await this.client.stringVariationDetail(
      key,
      ldContext,
      defaultValue,
    );

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
  async getNumberFlag(
    key: string,
    defaultValue: number,
    context: FlagContext,
  ): Promise<FlagEvaluation<number>> {
    const ldContext = this.buildLDContext(context);
    const detail = await this.client.numberVariationDetail(
      key,
      ldContext,
      defaultValue,
    );

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
  async getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context: FlagContext,
  ): Promise<FlagEvaluation<T>> {
    const ldContext = this.buildLDContext(context);
    const detail = await this.client.jsonVariationDetail(
      key,
      ldContext,
      defaultValue,
    );

    return {
      key,
      value: detail.value as T,
      variation: detail.variationIndex?.toString(),
      exists: detail.variationIndex !== null,
      reason: this.mapReason(detail.reason),
      timestamp: Date.now(),
    };
  }

  /**
   * Get all flag values for context
   */
  async getAllFlags(
    context: FlagContext,
  ): Promise<Record<string, FlagEvaluation>> {
    const ldContext = this.buildLDContext(context);
    const allFlags = await this.client.allFlagsState(ldContext, {
      withReasons: true,
    });

    const result: Record<string, FlagEvaluation> = {};
    const flags = allFlags.allValues();

    for (const [key, value] of Object.entries(flags)) {
      const flagState = allFlags.getFlagValue(key);
      const reason = allFlags.getFlagReason(key);
      const variation = allFlags.getVariationIndex(key);

      result[key] = {
        key,
        value: flagState ?? value,
        variation: variation?.toString(),
        exists: variation !== null,
        reason: reason ? this.mapReason(reason) : 'DEFAULT',
        timestamp: Date.now(),
      };
    }

    return result;
  }

  /**
   * Get flag definition (not fully supported by LaunchDarkly SDK)
   */
  async getFlagDefinition(key: string): Promise<FlagDefinition | null> {
    // LaunchDarkly SDK doesn't provide full flag metadata in server-side SDK
    // This would require using the LaunchDarkly REST API
    return null;
  }

  /**
   * List all flags (not fully supported by LaunchDarkly SDK)
   */
  async listFlags(): Promise<FlagDefinition[]> {
    // LaunchDarkly SDK doesn't provide full flag metadata in server-side SDK
    // This would require using the LaunchDarkly REST API
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
    const ldContext = this.buildLDContext(context);
    this.client.track(eventName, ldContext, data);
  }

  /**
   * Build LaunchDarkly context from flag context
   */
  private buildLDContext(context: FlagContext): ld.LDContext {
    const ldContext: ld.LDContext = {
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
  private mapReason(reason: ld.LDEvaluationReason): EvaluationReason {
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
  async flush(): Promise<void> {
    await this.client.flush();
  }
}
