import type {
  ConfigContext,
  EvaluationContext,
  FlagEvaluationResult,
  ExperimentAssignment,
  BatchEvaluationResponse,
} from '../types/index.js';

export interface ConfigClientOptions {
  /** Base URL of the config service */
  baseUrl: string;
  /** API key or token for authentication */
  apiKey?: string;
  /** Default tenant ID */
  tenantId?: string;
  /** Default environment */
  environment?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Enable local caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Polling interval for cache refresh in milliseconds */
  pollingIntervalMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight client SDK for the Config Service.
 * Designed for server-side usage with optional caching.
 */
export class ConfigClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly tenantId?: string;
  private readonly environment?: string;
  private readonly timeout: number;
  private readonly enableCache: boolean;
  private readonly cacheTtlMs: number;
  private readonly pollingIntervalMs: number;

  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private pollingTimer?: NodeJS.Timeout;

  constructor(options: ConfigClientOptions) {
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
  async getConfig<T = unknown>(
    key: string,
    context?: Partial<ConfigContext>,
    defaultValue?: T,
  ): Promise<T> {
    const fullContext = this.buildContext(context);
    const cacheKey = `config:${key}:${JSON.stringify(fullContext)}`;

    // Check cache
    if (this.enableCache) {
      const cached = this.getCached<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    try {
      const response = await this.graphql<{ configValue: T }>(
        `query GetConfig($key: String!, $context: ConfigContextInput) {
          configValue(key: $key, context: $context)
        }`,
        { key, context: fullContext },
      );

      const value = response.configValue ?? defaultValue;

      if (this.enableCache && value !== undefined) {
        this.setCache(cacheKey, value);
      }

      return value as T;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return defaultValue as T;
    }
  }

  /**
   * Check if a feature flag is enabled.
   */
  async isFeatureEnabled(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    const result = await this.evaluateFlag(flagKey, context);
    return result.enabled ? (result.value === true) : defaultValue;
  }

  /**
   * Get the value of a feature flag.
   */
  async getFlagValue<T = unknown>(
    flagKey: string,
    context: EvaluationContext,
    defaultValue?: T,
  ): Promise<T> {
    const result = await this.evaluateFlag(flagKey, context);
    return result.enabled ? (result.value as T) : (defaultValue as T);
  }

  /**
   * Evaluate a feature flag with full result details.
   */
  async evaluateFlag(
    flagKey: string,
    context: EvaluationContext,
  ): Promise<FlagEvaluationResult> {
    const fullContext = this.buildEvaluationContext(context);
    const cacheKey = `flag:${flagKey}:${context.userId}`;

    if (this.enableCache) {
      const cached = this.getCached<FlagEvaluationResult>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    try {
      const response = await this.graphql<{ evaluateFlag: FlagEvaluationResult }>(
        `query EvaluateFlag($flagKey: String!, $context: EvaluationContextInput!) {
          evaluateFlag(flagKey: $flagKey, context: $context) {
            flagKey
            value
            enabled
            reason
            ruleId
            segmentId
          }
        }`,
        { flagKey, context: fullContext },
      );

      const result = response.evaluateFlag;

      if (this.enableCache) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
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
  async getExperimentAssignment(
    experimentKey: string,
    context: EvaluationContext,
  ): Promise<ExperimentAssignment> {
    const fullContext = this.buildEvaluationContext(context);
    const cacheKey = `exp:${experimentKey}:${context.userId}`;

    if (this.enableCache) {
      const cached = this.getCached<ExperimentAssignment>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    try {
      const response = await this.graphql<{
        getExperimentAssignment: ExperimentAssignment;
      }>(
        `query GetExperimentAssignment($experimentKey: String!, $context: EvaluationContextInput!) {
          getExperimentAssignment(experimentKey: $experimentKey, context: $context) {
            experimentId
            experimentKey
            variantId
            variantName
            value
            inExperiment
            reason
          }
        }`,
        { experimentKey, context: fullContext },
      );

      const result = response.getExperimentAssignment;

      // Cache experiment assignments longer (sticky bucketing)
      if (this.enableCache) {
        this.setCache(cacheKey, result, this.cacheTtlMs * 10);
      }

      return result;
    } catch (error) {
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
  async batchEvaluate(
    context: EvaluationContext,
    options: {
      flagKeys?: string[];
      experimentKeys?: string[];
      configKeys?: string[];
    },
  ): Promise<BatchEvaluationResponse> {
    const fullContext = this.buildEvaluationContext(context);

    try {
      const response = await this.graphql<{
        batchEvaluate: BatchEvaluationResponse;
      }>(
        `query BatchEvaluate(
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
        }`,
        {
          context: fullContext,
          flagKeys: options.flagKeys,
          experimentKeys: options.experimentKeys,
          configKeys: options.configKeys,
        },
      );

      return response.batchEvaluate;
    } catch (error) {
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
  startPolling(): void {
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
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Clear the local cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Close the client and release resources.
   */
  close(): void {
    this.stopPolling();
    this.clearCache();
  }

  // Private helpers

  private buildContext(context?: Partial<ConfigContext>): ConfigContext {
    return {
      environment: context?.environment ?? this.environment,
      tenantId: context?.tenantId ?? this.tenantId,
      userId: context?.userId,
      attributes: context?.attributes,
    };
  }

  private buildEvaluationContext(
    context: EvaluationContext,
  ): EvaluationContext {
    return {
      userId: context.userId,
      tenantId: context.tenantId ?? this.tenantId,
      environment: context.environment ?? this.environment,
      attributes: context.attributes ?? {},
    };
  }

  private getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setCache<T>(
    key: string,
    value: T,
    ttlMs: number = this.cacheTtlMs,
  ): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private async refreshCache(): Promise<void> {
    // Prune expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
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

      return json.data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create a new ConfigClient instance.
 */
export function createConfigClient(
  options: ConfigClientOptions,
): ConfigClient {
  return new ConfigClient(options);
}

// Re-export types for convenience
export type {
  ConfigContext,
  EvaluationContext,
  FlagEvaluationResult,
  ExperimentAssignment,
  BatchEvaluationResponse,
} from '../types/index.js';
