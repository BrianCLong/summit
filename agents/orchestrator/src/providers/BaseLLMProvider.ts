/**
 * Base LLM Provider Interface
 *
 * Abstract base class for all LLM providers with common functionality
 * including retries, timeouts, and metrics tracking.
 */

import { EventEmitter } from 'eventemitter3';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMProviderConfig,
  TokenUsage,
  ProviderMetrics,
} from '../types/index.js';

export abstract class BaseLLMProvider extends EventEmitter {
  protected config: LLMProviderConfig;
  protected metrics: ProviderMetrics;

  constructor(config: LLMProviderConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  abstract get provider(): LLMProvider;
  abstract get supportedModels(): LLMModel[];

  /**
   * Execute a completion request with the provider
   */
  abstract complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Check if the provider is healthy
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Estimate cost for a request
   */
  abstract estimateCost(promptTokens: number, completionTokens: number): number;

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(operation(), this.config.timeout);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          this.emit('retry', {
            provider: this.provider,
            attempt: attempt + 1,
            maxRetries,
            delay,
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Wrap a promise with a timeout
   */
  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update metrics after a request
   */
  protected updateMetrics(success: boolean, latencyMs: number, usage: TokenUsage): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update latency (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageLatencyMs =
      (1 - alpha) * this.metrics.averageLatencyMs + alpha * latencyMs;

    // Update p95/p99 (simplified)
    if (latencyMs > this.metrics.p95LatencyMs * 0.95) {
      this.metrics.p95LatencyMs = Math.max(this.metrics.p95LatencyMs, latencyMs);
    }
    if (latencyMs > this.metrics.p99LatencyMs * 0.99) {
      this.metrics.p99LatencyMs = Math.max(this.metrics.p99LatencyMs, latencyMs);
    }

    this.metrics.totalTokens += usage.totalTokens;
    this.metrics.totalCostUSD += usage.estimatedCostUSD;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ProviderMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      totalTokens: 0,
      totalCostUSD: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Generate a unique response ID
   */
  protected generateResponseId(): string {
    return `${this.provider}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
