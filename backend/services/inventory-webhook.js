// Inventory Webhook Service - Asset Inventory v1.2
// Webhook delivery for lifecycle events with <5 min latency

const axios = require('axios');
const { Kafka } = require('kafkajs');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Prometheus metrics
const { Counter, Histogram, Gauge } = require('prom-client');

const WEBHOOK_DELIVERY_DURATION = new Histogram({
  name: 'inventory_webhook_delivery_duration_seconds',
  help: 'Webhook delivery duration',
  labelNames: ['event_type', 'status']
});

const WEBHOOK_DELIVERY_COUNTER = new Counter({
  name: 'inventory_webhook_deliveries_total',
  help: 'Total webhook deliveries',
  labelNames: ['event_type', 'status']
});

const WEBHOOK_LATENCY_GAUGE = new Gauge({
  name: 'inventory_webhook_latency_seconds',
  help: 'Webhook delivery latency (event time to delivery)',
  labelNames: ['event_type']
});

class InventoryWebhookService {
  constructor(kafkaBootstrap, webhookConfig) {
    this.webhookConfig = webhookConfig || {};
    this.kafka = new Kafka({
      clientId: 'inventory-webhook-service',
      brokers: kafkaBootstrap.split(',')
    });

    this.consumer = this.kafka.consumer({ groupId: 'inventory-webhook-consumers' });
    this.deliveryQueue = [];
    this.retryQueue = [];
  }

  async start() {
    await this.consumer.connect();

    // Subscribe to lifecycle events
    await this.consumer.subscribe({
      topics: ['inventory.lifecycle.events', 'inventory.anomaly.alerts'],
      fromBeginning: false
    });

    // Start consuming events
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());

        if (topic === 'inventory.lifecycle.events') {
          await this.handleLifecycleEvent(event);
        } else if (topic === 'inventory.anomaly.alerts') {
          await this.handleAnomalyAlert(event);
        }
      }
    });

    // Start retry worker
    this.startRetryWorker();

    logger.info('Inventory webhook service started');
  }

  async handleLifecycleEvent(event) {
    const eventType = event.event_type;
    const timestamp = new Date(event.timestamp);

    // Calculate latency from event time to now
    const latency = (Date.now() - timestamp.getTime()) / 1000;
    WEBHOOK_LATENCY_GAUGE.labels(eventType).set(latency);

    // Check latency SLO (≤5 min = 300 seconds)
    if (latency > 300) {
      logger.warn(`Lifecycle event latency exceeded SLO: ${latency}s for event ${event.event_id}`);
    }

    // Get configured webhooks for this event type
    const webhooks = this.getWebhooksForEvent('lifecycle', eventType, event.tenant);

    // Deliver to all webhooks
    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, event, 'lifecycle');
    }
  }

  async handleAnomalyAlert(anomaly) {
    const anomalyType = anomaly.anomaly_type;
    const timestamp = new Date(anomaly.detected_at);

    // Calculate latency
    const latency = (Date.now() - timestamp.getTime()) / 1000;
    WEBHOOK_LATENCY_GAUGE.labels(anomalyType).set(latency);

    // Get configured webhooks for anomaly alerts
    const webhooks = this.getWebhooksForEvent('anomaly', anomalyType, anomaly.tenant);

    // Deliver to all webhooks
    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, anomaly, 'anomaly');
    }
  }

  async deliverWebhook(webhook, payload, category) {
    const deliveryId = crypto.randomUUID();
    const eventType = payload.event_type || payload.anomaly_type;

    const timer = WEBHOOK_DELIVERY_DURATION.startTimer({ event_type: eventType, status: 'pending' });

    try {
      // Sign payload
      const signature = this.signPayload(payload, webhook.secret);

      // Prepare webhook delivery
      const headers = {
        'Content-Type': 'application/json',
        'X-Inventory-Event-Type': eventType,
        'X-Inventory-Category': category,
        'X-Inventory-Signature': signature,
        'X-Inventory-Delivery-Id': deliveryId,
        'X-Inventory-Timestamp': new Date().toISOString()
      };

      // Deliver with timeout
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout || 5000, // 5 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Success
      timer({ status: 'success' });
      WEBHOOK_DELIVERY_COUNTER.labels(eventType, 'success').inc();

      logger.debug(`Webhook delivered successfully: ${deliveryId} to ${webhook.url}`);

      return {
        success: true,
        deliveryId,
        statusCode: response.status,
        webhook: webhook.url
      };

    } catch (error) {
      // Failure
      timer({ status: 'failed' });
      WEBHOOK_DELIVERY_COUNTER.labels(eventType, 'failed').inc();

      logger.error(`Webhook delivery failed: ${deliveryId} to ${webhook.url}`, error);

      // Queue for retry if retryable
      if (this.isRetryable(error)) {
        this.queueRetry({
          deliveryId,
          webhook,
          payload,
          category,
          attempt: 1,
          maxAttempts: webhook.maxRetries || 3,
          nextRetryAt: Date.now() + this.getRetryDelay(1)
        });
      }

      return {
        success: false,
        deliveryId,
        error: error.message,
        webhook: webhook.url
      };
    }
  }

  signPayload(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  getWebhooksForEvent(category, eventType, tenant) {
    // Filter webhooks by category, event type, and tenant
    const webhooks = this.webhookConfig.webhooks || [];

    return webhooks.filter(webhook => {
      // Check if webhook is enabled
      if (!webhook.enabled) return false;

      // Check tenant match (or global)
      if (webhook.tenant && webhook.tenant !== tenant) return false;

      // Check category match
      if (webhook.categories && !webhook.categories.includes(category)) return false;

      // Check event type match
      if (webhook.eventTypes && !webhook.eventTypes.includes(eventType)) return false;

      return true;
    });
  }

  isRetryable(error) {
    // Retry on network errors or 5xx server errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return true;
    if (error.response && error.response.status >= 500) return true;
    return false;
  }

  getRetryDelay(attempt) {
    // Exponential backoff: 2^attempt seconds (2s, 4s, 8s, 16s, etc.)
    return Math.min(Math.pow(2, attempt) * 1000, 60000); // Max 60 seconds
  }

  queueRetry(retryEntry) {
    this.retryQueue.push(retryEntry);
    logger.info(`Queued webhook retry: ${retryEntry.deliveryId} (attempt ${retryEntry.attempt}/${retryEntry.maxAttempts})`);
  }

  async startRetryWorker() {
    setInterval(async () => {
      const now = Date.now();

      // Find retries that are ready
      const readyRetries = this.retryQueue.filter(r => r.nextRetryAt <= now);

      for (const retry of readyRetries) {
        // Remove from queue
        this.retryQueue = this.retryQueue.filter(r => r.deliveryId !== retry.deliveryId);

        // Attempt delivery
        const result = await this.deliverWebhook(retry.webhook, retry.payload, retry.category);

        // If failed and retries remaining, re-queue
        if (!result.success && retry.attempt < retry.maxAttempts) {
          this.queueRetry({
            ...retry,
            attempt: retry.attempt + 1,
            nextRetryAt: now + this.getRetryDelay(retry.attempt + 1)
          });
        } else if (!result.success) {
          logger.error(`Webhook delivery exhausted retries: ${retry.deliveryId}`);
          WEBHOOK_DELIVERY_COUNTER.labels(retry.payload.event_type || retry.payload.anomaly_type, 'exhausted').inc();
        }
      }
    }, 1000); // Check every second
  }

  async stop() {
    await this.consumer.disconnect();
    logger.info('Inventory webhook service stopped');
  }
}

// Example webhook configuration
const exampleConfig = {
  webhooks: [
    {
      id: 'webhook-1',
      url: 'https://acme.com/webhooks/inventory-lifecycle',
      secret: 'webhook-secret-key',
      enabled: true,
      tenant: 'acme',
      categories: ['lifecycle'],
      eventTypes: ['created', 'updated', 'deleted'],
      timeout: 5000,
      maxRetries: 3
    },
    {
      id: 'webhook-2',
      url: 'https://acme.com/webhooks/inventory-anomalies',
      secret: 'webhook-secret-key',
      enabled: true,
      tenant: 'acme',
      categories: ['anomaly'],
      eventTypes: ['orphan_asset', 'owner_mismatch', 'high_churn'],
      timeout: 5000,
      maxRetries: 3
    },
    {
      id: 'webhook-global',
      url: 'https://monitoring.example.com/webhooks/all-events',
      secret: 'global-webhook-secret',
      enabled: true,
      tenant: null, // Global - all tenants
      categories: ['lifecycle', 'anomaly'],
      eventTypes: null, // All event types
      timeout: 10000,
      maxRetries: 5
    }
  ]
};

module.exports = { InventoryWebhookService, exampleConfig };
