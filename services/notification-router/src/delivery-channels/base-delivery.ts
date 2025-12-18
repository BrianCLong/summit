/**
 * Base Delivery Channel Interface
 *
 * All delivery channels must implement this interface.
 */

import type {
  DeliveryResult,
  NotificationMessage,
  NotificationChannel,
} from '../types.js';

export interface IDeliveryChannel {
  readonly name: NotificationChannel;
  readonly enabled: boolean;

  /**
   * Deliver a notification message
   */
  deliver(message: NotificationMessage): Promise<DeliveryResult>;

  /**
   * Health check for this delivery channel
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get channel statistics
   */
  getStats(): Promise<ChannelStats>;
}

export interface ChannelStats {
  sent: number;
  delivered: number;
  failed: number;
  retried: number;
  avgDeliveryTimeMs: number;
}

/**
 * Abstract base class for delivery channels
 */
export abstract class BaseDeliveryChannel implements IDeliveryChannel {
  abstract readonly name: NotificationChannel;
  abstract readonly enabled: boolean;

  protected stats: ChannelStats = {
    sent: 0,
    delivered: 0,
    failed: 0,
    retried: 0,
    avgDeliveryTimeMs: 0,
  };

  abstract deliver(message: NotificationMessage): Promise<DeliveryResult>;

  abstract healthCheck(): Promise<boolean>;

  async getStats(): Promise<ChannelStats> {
    return { ...this.stats };
  }

  /**
   * Update delivery statistics
   */
  protected updateStats(result: DeliveryResult, durationMs: number): void {
    if (result.success) {
      this.stats.sent++;
      this.stats.delivered++;
    } else {
      this.stats.failed++;
    }

    // Update average delivery time (exponential moving average)
    if (this.stats.avgDeliveryTimeMs === 0) {
      this.stats.avgDeliveryTimeMs = durationMs;
    } else {
      this.stats.avgDeliveryTimeMs =
        0.9 * this.stats.avgDeliveryTimeMs + 0.1 * durationMs;
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.stats.retried++;

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mask sensitive data in messages for external channels
   */
  protected maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'ssn',
      'creditCard',
      'email',
      'phone',
      'ip_address',
    ];

    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        masked[key] = '[REDACTED]';
      }
    }

    return masked;
  }
}
