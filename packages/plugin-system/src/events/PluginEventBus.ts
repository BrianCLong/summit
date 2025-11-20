import EventEmitter from 'eventemitter3';

/**
 * Event bus for plugin system events and webhooks
 */
export class PluginEventBus extends EventEmitter {
  private webhookSubscriptions = new Map<string, WebhookSubscription[]>();
  private eventHistory: EventRecord[] = [];
  private maxHistorySize = 1000;

  /**
   * Subscribe to webhook events
   */
  subscribeWebhook(subscription: WebhookSubscription): string {
    const id = this.generateSubscriptionId();
    const subscriptions = this.webhookSubscriptions.get(subscription.event) || [];
    subscriptions.push({ ...subscription, id });
    this.webhookSubscriptions.set(subscription.event, subscriptions);

    // Listen to the event
    this.on(subscription.event, async (data: any) => {
      await this.triggerWebhook(subscription, data);
    });

    return id;
  }

  /**
   * Unsubscribe from webhook
   */
  unsubscribeWebhook(subscriptionId: string): boolean {
    for (const [event, subscriptions] of this.webhookSubscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.webhookSubscriptions.delete(event);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Emit event and record in history
   */
  async emitEvent(event: string, data: any): Promise<void> {
    // Record event
    this.recordEvent({
      event,
      data,
      timestamp: new Date(),
    });

    // Emit event
    this.emit(event, data);
  }

  /**
   * Get event history
   */
  getHistory(filter?: EventFilter): EventRecord[] {
    let history = this.eventHistory;

    if (filter?.event) {
      history = history.filter(record => record.event === filter.event);
    }

    if (filter?.since) {
      history = history.filter(record => record.timestamp >= filter.since!);
    }

    if (filter?.until) {
      history = history.filter(record => record.timestamp <= filter.until!);
    }

    return history;
  }

  /**
   * Replay events
   */
  async replayEvents(filter: EventFilter, handler: (record: EventRecord) => Promise<void>): Promise<void> {
    const events = this.getHistory(filter);

    for (const record of events) {
      await handler(record);
    }
  }

  /**
   * Trigger webhook
   */
  private async triggerWebhook(subscription: WebhookSubscription, data: any): Promise<void> {
    // Apply filter if present
    if (subscription.filter && !subscription.filter(data)) {
      return;
    }

    // Transform payload if transformer present
    let payload = data;
    if (subscription.transformer) {
      payload = subscription.transformer(data);
    }

    // Call webhook URL with retry
    await this.callWebhookWithRetry(subscription.url, payload, subscription.retryPolicy);
  }

  /**
   * Call webhook with retry policy
   */
  private async callWebhookWithRetry(
    url: string,
    payload: any,
    retryPolicy?: RetryPolicy
  ): Promise<void> {
    const maxRetries = retryPolicy?.maxRetries || 3;
    const retryDelayMs = retryPolicy?.retryDelayMs || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': this.generateSignature(payload),
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return; // Success
        }

        lastError = new Error(`Webhook returned status ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await this.sleep(retryDelayMs * Math.pow(2, attempt));
      }
    }

    // Send to dead letter queue if all retries failed
    if (retryPolicy?.deadLetterQueue) {
      await this.sendToDeadLetterQueue({
        url,
        payload,
        error: lastError?.message || 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Record event in history
   */
  private recordEvent(record: EventRecord): void {
    this.eventHistory.push(record);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: any): string {
    // Would use HMAC signature in production
    return 'signature';
  }

  /**
   * Send failed webhook to dead letter queue
   */
  private async sendToDeadLetterQueue(failedWebhook: any): Promise<void> {
    // Would send to actual DLQ (Redis, SQS, etc.)
    console.error('Webhook failed, sending to DLQ:', failedWebhook);
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface WebhookSubscription {
  id?: string;
  event: string;
  url: string;
  filter?: (data: any) => boolean;
  transformer?: (data: any) => any;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  deadLetterQueue?: boolean;
}

export interface EventRecord {
  event: string;
  data: any;
  timestamp: Date;
}

export interface EventFilter {
  event?: string;
  since?: Date;
  until?: Date;
}
