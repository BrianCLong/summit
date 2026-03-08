"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginEventBus = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
/**
 * Event bus for plugin system events and webhooks
 */
class PluginEventBus extends eventemitter3_1.default {
    webhookSubscriptions = new Map();
    eventHistory = [];
    maxHistorySize = 1000;
    /**
     * Subscribe to webhook events
     */
    subscribeWebhook(subscription) {
        const id = this.generateSubscriptionId();
        const subscriptions = this.webhookSubscriptions.get(subscription.event) || [];
        subscriptions.push({ ...subscription, id });
        this.webhookSubscriptions.set(subscription.event, subscriptions);
        // Listen to the event
        this.on(this.partitionedEvent(subscription.event, subscription.tenantId), async (data) => {
            await this.triggerWebhook(subscription, data);
        });
        return id;
    }
    /**
     * Unsubscribe from webhook
     */
    unsubscribeWebhook(subscriptionId) {
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
    async emitEvent(event, data, tenantId) {
        const resolvedTenant = tenantId || data?.tenantId;
        if (!resolvedTenant) {
            throw new Error('Tenant ID is required to emit plugin events');
        }
        const eventKey = this.partitionedEvent(event, resolvedTenant);
        // Record event
        this.recordEvent({
            event,
            data,
            tenantId: resolvedTenant,
            partitionKey: `tenant:${resolvedTenant}`,
            timestamp: new Date(),
        });
        // Emit event
        this.emit(eventKey, { ...data, tenantId: resolvedTenant });
    }
    /**
     * Get event history
     */
    getHistory(filter) {
        let history = this.eventHistory;
        if (filter?.event) {
            history = history.filter(record => record.event === filter.event);
        }
        if (filter?.tenantId) {
            history = history.filter(record => record.tenantId === filter.tenantId);
        }
        if (filter?.since) {
            history = history.filter(record => record.timestamp >= filter.since);
        }
        if (filter?.until) {
            history = history.filter(record => record.timestamp <= filter.until);
        }
        return history;
    }
    /**
     * Replay events
     */
    async replayEvents(filter, handler) {
        const events = this.getHistory(filter);
        for (const record of events) {
            await handler(record);
        }
    }
    /**
     * Trigger webhook
     */
    async triggerWebhook(subscription, data) {
        // Apply filter if present
        if (subscription.filter && !subscription.filter(data)) {
            return;
        }
        if (subscription.tenantId && data?.tenantId && data.tenantId !== subscription.tenantId) {
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
    async callWebhookWithRetry(url, payload, retryPolicy) {
        const maxRetries = retryPolicy?.maxRetries || 3;
        const retryDelayMs = retryPolicy?.retryDelayMs || 1000;
        let lastError;
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
            }
            catch (error) {
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
    recordEvent(record) {
        this.eventHistory.push(record);
        // Trim history if too large
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    /**
     * Generate webhook signature
     */
    generateSignature(payload) {
        // Would use HMAC signature in production
        return 'signature';
    }
    /**
     * Send failed webhook to dead letter queue
     */
    async sendToDeadLetterQueue(failedWebhook) {
        // Would send to actual DLQ (Redis, SQS, etc.)
        console.error('Webhook failed, sending to DLQ:', failedWebhook);
    }
    /**
     * Generate unique subscription ID
     */
    generateSubscriptionId() {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    partitionedEvent(event, tenantId) {
        return tenantId ? `${event}:${tenantId}` : event;
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.PluginEventBus = PluginEventBus;
