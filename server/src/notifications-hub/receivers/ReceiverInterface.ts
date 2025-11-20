/**
 * Receiver Interface for Notification Channels
 *
 * Defines the contract for all notification receivers (email, chat, webhooks, etc.)
 * Each receiver is responsible for delivering notifications through its specific channel.
 */

import { CanonicalEvent } from '../events/EventSchema.js';

export interface ReceiverConfig {
  enabled: boolean;
  name: string;
  description?: string;
  retryPolicy?: RetryPolicy;
  rateLimiting?: RateLimitConfig;
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

export interface DeliveryResult {
  success: boolean;
  recipientId: string;
  channel: string;
  messageId?: string;
  error?: Error;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ReceiverMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  averageLatencyMs: number;
  lastDeliveryAt?: Date;
  lastFailureAt?: Date;
}

/**
 * Base interface that all receivers must implement
 */
export interface IReceiver {
  /**
   * Unique identifier for this receiver
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Initialize the receiver
   */
  initialize(config: ReceiverConfig): Promise<void>;

  /**
   * Send notification to recipients
   */
  send(
    event: CanonicalEvent,
    recipients: string[],
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult[]>;

  /**
   * Validate that a recipient can receive notifications through this channel
   */
  validateRecipient(recipient: string): Promise<boolean>;

  /**
   * Check if the receiver is healthy and operational
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get metrics for this receiver
   */
  getMetrics(): ReceiverMetrics;

  /**
   * Shutdown the receiver gracefully
   */
  shutdown(): Promise<void>;
}

/**
 * Abstract base class with common receiver functionality
 */
export abstract class BaseReceiver implements IReceiver {
  protected config: ReceiverConfig;
  protected metrics: ReceiverMetrics;
  protected initialized: boolean = false;

  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      averageLatencyMs: 0,
    };
  }

  async initialize(config: ReceiverConfig): Promise<void> {
    this.config = config;
    await this.onInitialize();
    this.initialized = true;
  }

  protected abstract onInitialize(): Promise<void>;

  async send(
    event: CanonicalEvent,
    recipients: string[],
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult[]> {
    if (!this.initialized) {
      throw new Error(`Receiver ${this.id} not initialized`);
    }

    if (!this.config.enabled) {
      throw new Error(`Receiver ${this.id} is disabled`);
    }

    this.metrics.totalSent += recipients.length;

    const startTime = Date.now();
    const results: DeliveryResult[] = [];

    for (const recipient of recipients) {
      try {
        const isValid = await this.validateRecipient(recipient);
        if (!isValid) {
          results.push({
            success: false,
            recipientId: recipient,
            channel: this.id,
            error: new Error(`Invalid recipient: ${recipient}`),
          });
          this.metrics.totalFailed++;
          continue;
        }

        const result = await this.deliverToRecipient(event, recipient, options);
        results.push(result);

        if (result.success) {
          this.metrics.totalDelivered++;
          this.metrics.lastDeliveryAt = new Date();
        } else {
          this.metrics.totalFailed++;
          this.metrics.lastFailureAt = new Date();
        }
      } catch (error) {
        results.push({
          success: false,
          recipientId: recipient,
          channel: this.id,
          error: error as Error,
        });
        this.metrics.totalFailed++;
        this.metrics.lastFailureAt = new Date();
      }
    }

    const latency = Date.now() - startTime;
    this.updateAverageLatency(latency);

    return results;
  }

  protected abstract deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult>;

  abstract validateRecipient(recipient: string): Promise<boolean>;

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) return false;
    if (!this.config.enabled) return false;
    return this.performHealthCheck();
  }

  protected abstract performHealthCheck(): Promise<boolean>;

  getMetrics(): ReceiverMetrics {
    return { ...this.metrics };
  }

  protected updateAverageLatency(latencyMs: number): void {
    const totalLatency =
      this.metrics.averageLatencyMs * this.metrics.totalDelivered;
    this.metrics.averageLatencyMs =
      (totalLatency + latencyMs) / (this.metrics.totalDelivered + 1);
  }

  async shutdown(): Promise<void> {
    await this.onShutdown();
    this.initialized = false;
  }

  protected abstract onShutdown(): Promise<void>;

  /**
   * Helper method for exponential backoff retry
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    const retryPolicy = this.config.retryPolicy || {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
    };

    let lastError: Error;
    for (let attempt = 0; attempt < retryPolicy.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < retryPolicy.maxAttempts - 1) {
          const delay = Math.min(
            retryPolicy.initialDelayMs *
              Math.pow(retryPolicy.backoffMultiplier, attempt),
            retryPolicy.maxDelayMs,
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `${context} failed after ${retryPolicy.maxAttempts} attempts: ${lastError.message}`,
    );
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
