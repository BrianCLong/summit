/**
 * Webhook Notification Service
 * Sends webhook notifications for catalog events
 */

export enum WebhookEventType {
  ASSET_CREATED = 'asset.created',
  ASSET_UPDATED = 'asset.updated',
  ASSET_DELETED = 'asset.deleted',
  ASSET_DEPRECATED = 'asset.deprecated',
  ASSET_CERTIFIED = 'asset.certified',
  COMMENT_ADDED = 'comment.added',
  GLOSSARY_TERM_APPROVED = 'glossary.term.approved',
  GLOSSARY_TERM_REJECTED = 'glossary.term.rejected',
  DISCOVERY_JOB_COMPLETED = 'discovery.job.completed',
  DISCOVERY_JOB_FAILED = 'discovery.job.failed',
  LINEAGE_UPDATED = 'lineage.updated',
  QUALITY_SCORE_CHANGED = 'quality.score.changed',
}

export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  enabled: boolean;
  filters?: Record<string, any>;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface WebhookPayload {
  eventType: WebhookEventType;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  response?: {
    statusCode: number;
    body: string;
  };
}

export interface IWebhookStore {
  getSubscription(id: string): Promise<WebhookSubscription | null>;
  listSubscriptions(eventType?: WebhookEventType): Promise<WebhookSubscription[]>;
  createSubscription(subscription: WebhookSubscription): Promise<WebhookSubscription>;
  updateSubscription(id: string, updates: Partial<WebhookSubscription>): Promise<WebhookSubscription>;
  deleteSubscription(id: string): Promise<void>;
  recordDelivery(delivery: WebhookDelivery): Promise<void>;
}

export class WebhookService {
  private readonly maxRetries = 3;
  private readonly retryDelay = [1000, 5000, 15000]; // ms

  constructor(private store: IWebhookStore) {}

  /**
   * Trigger webhook for event
   */
  async triggerEvent(eventType: WebhookEventType, data: any, metadata?: Record<string, any>): Promise<void> {
    const subscriptions = await this.store.listSubscriptions(eventType);

    const payload: WebhookPayload = {
      eventType,
      timestamp: new Date(),
      data,
      metadata,
    };

    // Send webhooks in parallel
    await Promise.allSettled(
      subscriptions
        .filter((sub) => sub.enabled)
        .filter((sub) => this.matchesFilters(data, sub.filters))
        .map((sub) => this.deliverWebhook(sub, payload))
    );
  }

  /**
   * Deliver webhook to subscriber
   */
  private async deliverWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<void> {
    const delivery: WebhookDelivery = {
      id: this.generateDeliveryId(),
      subscriptionId: subscription.id,
      eventType: payload.eventType,
      payload,
      status: 'pending',
      attempts: 0,
    };

    await this.attemptDelivery(subscription, delivery);
  }

  /**
   * Attempt webhook delivery with retries
   */
  private async attemptDelivery(
    subscription: WebhookSubscription,
    delivery: WebhookDelivery,
    retryCount: number = 0
  ): Promise<void> {
    try {
      delivery.attempts++;
      delivery.lastAttempt = new Date();

      // Sign payload
      const signature = this.signPayload(delivery.payload, subscription.secret);

      // Make HTTP request
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-Delivery': delivery.id,
        },
        body: JSON.stringify(delivery.payload),
      });

      delivery.response = {
        statusCode: response.status,
        body: await response.text(),
      };

      if (response.ok) {
        delivery.status = 'delivered';
        await this.store.recordDelivery(delivery);

        // Update last triggered time
        await this.store.updateSubscription(subscription.id, {
          lastTriggered: new Date(),
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${delivery.response.body}`);
      }
    } catch (error) {
      // Retry logic
      if (retryCount < this.maxRetries) {
        delivery.status = 'pending';
        delivery.nextRetry = new Date(Date.now() + this.retryDelay[retryCount]);
        await this.store.recordDelivery(delivery);

        // Schedule retry
        setTimeout(() => {
          this.attemptDelivery(subscription, delivery, retryCount + 1);
        }, this.retryDelay[retryCount]);
      } else {
        delivery.status = 'failed';
        await this.store.recordDelivery(delivery);
      }
    }
  }

  /**
   * Sign payload with HMAC
   */
  private signPayload(payload: WebhookPayload, secret: string): string {
    // In production, use crypto.createHmac
    const payloadString = JSON.stringify(payload);
    return `sha256=${Buffer.from(payloadString + secret).toString('base64')}`;
  }

  /**
   * Check if data matches subscription filters
   */
  private matchesFilters(data: any, filters?: Record<string, any>): boolean {
    if (!filters) {
      return true;
    }

    for (const [key, value] of Object.entries(filters)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create webhook subscription
   */
  async createSubscription(
    url: string,
    events: WebhookEventType[],
    secret: string,
    filters?: Record<string, any>
  ): Promise<WebhookSubscription> {
    const subscription: WebhookSubscription = {
      id: this.generateSubscriptionId(),
      url,
      events,
      secret,
      enabled: true,
      filters,
      createdAt: new Date(),
    };

    return this.store.createSubscription(subscription);
  }

  /**
   * Update webhook subscription
   */
  async updateSubscription(id: string, updates: Partial<WebhookSubscription>): Promise<WebhookSubscription> {
    return this.store.updateSubscription(id, updates);
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    await this.store.deleteSubscription(id);
  }

  /**
   * List webhook subscriptions
   */
  async listSubscriptions(eventType?: WebhookEventType): Promise<WebhookSubscription[]> {
    return this.store.listSubscriptions(eventType);
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(subscriptionId: string): Promise<boolean> {
    const subscription = await this.store.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const testPayload: WebhookPayload = {
      eventType: WebhookEventType.ASSET_CREATED,
      timestamp: new Date(),
      data: {
        test: true,
        message: 'This is a test webhook',
      },
      metadata: {
        subscriptionId,
      },
    };

    try {
      await this.deliverWebhook(subscription, testPayload);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `webhook-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate delivery ID
   */
  private generateDeliveryId(): string {
    return `webhook-del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Webhook Event Helpers
 */
export class WebhookEvents {
  /**
   * Create asset created event
   */
  static assetCreated(asset: any): { eventType: WebhookEventType; data: any } {
    return {
      eventType: WebhookEventType.ASSET_CREATED,
      data: {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        owner: asset.owner,
        createdAt: asset.createdAt,
      },
    };
  }

  /**
   * Create asset updated event
   */
  static assetUpdated(asset: any, changes: any): { eventType: WebhookEventType; data: any } {
    return {
      eventType: WebhookEventType.ASSET_UPDATED,
      data: {
        assetId: asset.id,
        assetName: asset.name,
        changes,
        updatedAt: asset.updatedAt,
      },
    };
  }

  /**
   * Create quality score changed event
   */
  static qualityScoreChanged(assetId: string, oldScore: number, newScore: number): {
    eventType: WebhookEventType;
    data: any;
  } {
    return {
      eventType: WebhookEventType.QUALITY_SCORE_CHANGED,
      data: {
        assetId,
        oldScore,
        newScore,
        change: newScore - oldScore,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Create discovery job completed event
   */
  static discoveryJobCompleted(jobId: string, assetsDiscovered: number): {
    eventType: WebhookEventType;
    data: any;
  } {
    return {
      eventType: WebhookEventType.DISCOVERY_JOB_COMPLETED,
      data: {
        jobId,
        assetsDiscovered,
        completedAt: new Date(),
      },
    };
  }
}
