"use strict";
/**
 * Receiver Interface for Notification Channels
 *
 * Defines the contract for all notification receivers (email, chat, webhooks, etc.)
 * Each receiver is responsible for delivering notifications through its specific channel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseReceiver = void 0;
/**
 * Abstract base class with common receiver functionality
 */
class BaseReceiver {
    id;
    name;
    config;
    metrics;
    initialized = false;
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.metrics = {
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0,
            averageLatencyMs: 0,
        };
    }
    async initialize(config) {
        this.config = config;
        await this.onInitialize();
        this.initialized = true;
    }
    async send(event, recipients, options) {
        if (!this.initialized) {
            throw new Error(`Receiver ${this.id} not initialized`);
        }
        if (!this.config.enabled) {
            throw new Error(`Receiver ${this.id} is disabled`);
        }
        this.metrics.totalSent += recipients.length;
        const startTime = Date.now();
        const results = [];
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
                const result = await this.retryWithBackoff(() => this.deliverToRecipient(event, recipient, options), `${this.id}:deliver:${recipient}`);
                results.push(result);
                if (result.success) {
                    this.metrics.totalDelivered++;
                    this.metrics.lastDeliveryAt = new Date();
                }
                else {
                    this.metrics.totalFailed++;
                    this.metrics.lastFailureAt = new Date();
                }
            }
            catch (error) {
                results.push({
                    success: false,
                    recipientId: recipient,
                    channel: this.id,
                    error: error,
                });
                this.metrics.totalFailed++;
                this.metrics.lastFailureAt = new Date();
            }
        }
        const latency = Date.now() - startTime;
        this.updateAverageLatency(latency);
        return results;
    }
    async healthCheck() {
        if (!this.initialized)
            return false;
        if (!this.config.enabled)
            return false;
        return this.performHealthCheck();
    }
    getMetrics() {
        return { ...this.metrics };
    }
    updateAverageLatency(latencyMs) {
        const totalLatency = this.metrics.averageLatencyMs * this.metrics.totalDelivered;
        this.metrics.averageLatencyMs =
            (totalLatency + latencyMs) / (this.metrics.totalDelivered + 1);
    }
    async shutdown() {
        await this.onShutdown();
        this.initialized = false;
    }
    /**
     * Helper method for exponential backoff retry
     */
    async retryWithBackoff(operation, context) {
        const retryPolicy = this.config.retryPolicy || {
            maxAttempts: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
        };
        let lastError = new Error('Unknown error');
        for (let attempt = 0; attempt < retryPolicy.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < retryPolicy.maxAttempts - 1) {
                    const delay = Math.min(retryPolicy.initialDelayMs *
                        Math.pow(retryPolicy.backoffMultiplier, attempt), retryPolicy.maxDelayMs);
                    await this.sleep(delay);
                }
            }
        }
        throw new Error(`${context} failed after ${retryPolicy.maxAttempts} attempts: ${lastError.message}`);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BaseReceiver = BaseReceiver;
