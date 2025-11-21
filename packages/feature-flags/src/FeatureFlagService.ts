/**
 * Feature Flag Service
 *
 * Core service for feature flag evaluation with caching, analytics, and metrics
 */

import EventEmitter from 'eventemitter3';
import type {
  FeatureFlagConfig,
  FeatureFlagProvider,
  FlagCache,
  FlagContext,
  FlagEvaluation,
  FlagDefinition,
  FlagVariation,
  FlagAnalyticsEvent,
  FlagMetrics,
} from './types.js';

/**
 * Events emitted by the feature flag service
 */
export interface FeatureFlagServiceEvents {
  ready: () => void;
  error: (error: Error) => void;
  evaluation: (event: FlagAnalyticsEvent) => void;
  cacheHit: (flagKey: string) => void;
  cacheMiss: (flagKey: string) => void;
}

/**
 * Feature Flag Service
 */
export class FeatureFlagService extends EventEmitter<FeatureFlagServiceEvents> {
  private provider: FeatureFlagProvider;
  private cache?: FlagCache;
  private config: Required<
    Omit<FeatureFlagConfig, 'cache' | 'bootstrap' | 'defaultContext'>
  > & {
    cache?: FlagCache;
    defaultContext?: Partial<FlagContext>;
  };
  private metrics?: FlagMetrics;
  private isInitialized = false;
  private analyticsBuffer: FlagAnalyticsEvent[] = [];
  private analyticsFlushInterval?: NodeJS.Timeout;

  constructor(config: FeatureFlagConfig) {
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
  async initialize(): Promise<void> {
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
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Shutdown the service
   */
  async close(): Promise<void> {
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
  isReady(): boolean {
    return this.isInitialized && this.provider.isReady();
  }

  /**
   * Evaluate a boolean flag
   */
  async getBooleanFlag(
    key: string,
    defaultValue: boolean,
    context?: Partial<FlagContext>,
  ): Promise<boolean> {
    const evaluation = await this.evaluateFlag<boolean>(
      key,
      defaultValue,
      context,
      'boolean',
    );
    return evaluation.value;
  }

  /**
   * Evaluate a string flag
   */
  async getStringFlag(
    key: string,
    defaultValue: string,
    context?: Partial<FlagContext>,
  ): Promise<string> {
    const evaluation = await this.evaluateFlag<string>(
      key,
      defaultValue,
      context,
      'string',
    );
    return evaluation.value;
  }

  /**
   * Evaluate a number flag
   */
  async getNumberFlag(
    key: string,
    defaultValue: number,
    context?: Partial<FlagContext>,
  ): Promise<number> {
    const evaluation = await this.evaluateFlag<number>(
      key,
      defaultValue,
      context,
      'number',
    );
    return evaluation.value;
  }

  /**
   * Evaluate a JSON flag
   */
  async getJSONFlag<T = any>(
    key: string,
    defaultValue: T,
    context?: Partial<FlagContext>,
  ): Promise<T> {
    const evaluation = await this.evaluateFlag<T>(
      key,
      defaultValue,
      context,
      'json',
    );
    return evaluation.value;
  }

  /**
   * Get detailed evaluation result
   */
  async getEvaluation<T = FlagVariation>(
    key: string,
    defaultValue: T,
    context?: Partial<FlagContext>,
  ): Promise<FlagEvaluation<T>> {
    return this.evaluateFlag<T>(key, defaultValue, context);
  }

  /**
   * Get all flag values for context
   */
  async getAllFlags(
    context?: Partial<FlagContext>,
  ): Promise<Record<string, FlagVariation>> {
    const fullContext = this.buildContext(context);
    const allFlags = await this.provider.getAllFlags(fullContext);

    const result: Record<string, FlagVariation> = {};
    for (const [key, evaluation] of Object.entries(allFlags)) {
      result[key] = evaluation.value;
    }

    return result;
  }

  /**
   * Track a custom event
   */
  async track(
    eventName: string,
    context?: Partial<FlagContext>,
    data?: Record<string, any>,
  ): Promise<void> {
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
  async getFlagDefinition(key: string): Promise<FlagDefinition | null> {
    return this.provider.getFlagDefinition(key);
  }

  /**
   * List all flags
   */
  async listFlags(): Promise<FlagDefinition[]> {
    return this.provider.listFlags();
  }

  /**
   * Set metrics instance
   */
  setMetrics(metrics: FlagMetrics): void {
    this.metrics = metrics;
  }

  /**
   * Get metrics instance
   */
  getMetrics(): FlagMetrics | undefined {
    return this.metrics;
  }

  /**
   * Evaluate a flag with caching and metrics
   */
  private async evaluateFlag<T = FlagVariation>(
    key: string,
    defaultValue: T,
    context?: Partial<FlagContext>,
    type?: string,
  ): Promise<FlagEvaluation<T>> {
    const startTime = Date.now();
    const fullContext = this.buildContext(context);

    try {
      // Check cache first
      if (this.config.enableCache && this.cache) {
        const cached = await this.getCachedEvaluation<T>(key, fullContext);
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
      let evaluation: FlagEvaluation<T>;

      switch (type) {
        case 'boolean':
          evaluation = (await this.provider.getBooleanFlag(
            key,
            defaultValue as boolean,
            fullContext,
          )) as FlagEvaluation<T>;
          break;
        case 'string':
          evaluation = (await this.provider.getStringFlag(
            key,
            defaultValue as string,
            fullContext,
          )) as FlagEvaluation<T>;
          break;
        case 'number':
          evaluation = (await this.provider.getNumberFlag(
            key,
            defaultValue as number,
            fullContext,
          )) as FlagEvaluation<T>;
          break;
        case 'json':
          evaluation = await this.provider.getJSONFlag<T>(
            key,
            defaultValue,
            fullContext,
          );
          break;
        default:
          // Auto-detect type
          if (typeof defaultValue === 'boolean') {
            evaluation = (await this.provider.getBooleanFlag(
              key,
              defaultValue,
              fullContext,
            )) as FlagEvaluation<T>;
          } else if (typeof defaultValue === 'string') {
            evaluation = (await this.provider.getStringFlag(
              key,
              defaultValue,
              fullContext,
            )) as FlagEvaluation<T>;
          } else if (typeof defaultValue === 'number') {
            evaluation = (await this.provider.getNumberFlag(
              key,
              defaultValue,
              fullContext,
            )) as FlagEvaluation<T>;
          } else {
            evaluation = await this.provider.getJSONFlag<T>(
              key,
              defaultValue,
              fullContext,
            );
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
    } catch (error) {
      if (this.metrics) {
        this.metrics.recordError(key, error as Error);
      }

      this.emit('error', error as Error);

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
  private buildContext(context?: Partial<FlagContext>): FlagContext {
    return {
      ...this.config.defaultContext,
      ...context,
    } as FlagContext;
  }

  /**
   * Get cached evaluation
   */
  private async getCachedEvaluation<T>(
    key: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<T> | null> {
    if (!this.cache) {
      return null;
    }

    try {
      const cached = await this.cache.get<T>(key, context);
      if (cached) {
        cached.fromCache = true;
      }
      return cached;
    } catch (error) {
      // Cache errors should not break evaluation
      return null;
    }
  }

  /**
   * Set cached evaluation
   */
  private async setCachedEvaluation<T>(
    key: string,
    context: FlagContext,
    evaluation: FlagEvaluation<T>,
  ): Promise<void> {
    if (!this.cache) {
      return;
    }

    try {
      await this.cache.set(key, context, evaluation, this.config.cacheTTL);
    } catch (error) {
      // Cache errors should not break evaluation
    }
  }

  /**
   * Record analytics event
   */
  private recordAnalyticsEvent(event: FlagAnalyticsEvent): void {
    this.analyticsBuffer.push(event);

    // Flush if buffer is large
    if (this.analyticsBuffer.length >= 100) {
      this.flushAnalytics();
    }
  }

  /**
   * Start analytics flush interval
   */
  private startAnalyticsFlush(): void {
    // Flush every 10 seconds
    this.analyticsFlushInterval = setInterval(() => {
      this.flushAnalytics();
    }, 10000);
  }

  /**
   * Flush analytics buffer
   */
  private async flushAnalytics(): Promise<void> {
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
