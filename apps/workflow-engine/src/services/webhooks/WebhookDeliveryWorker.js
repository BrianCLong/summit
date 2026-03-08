"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDeliveryWorker = exports.NoopMetrics = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
class NoopMetrics {
    recordDeadLetter(error) {
        logger_1.logger.warn('webhook.dead_letter', { error });
    }
    recordFailure() {
        logger_1.logger.warn('webhook.delivery_failure');
    }
    recordSuccess() {
        logger_1.logger.info('webhook.delivery_success');
    }
}
exports.NoopMetrics = NoopMetrics;
class WebhookDeliveryWorker {
    repository;
    service;
    batchSize;
    maxAttempts;
    baseBackoffMs;
    signatureHeader;
    idempotencyHeader;
    eventHeader;
    metrics;
    httpClient;
    constructor(repository, service, options = {}) {
        this.repository = repository;
        this.service = service;
        this.batchSize = options.batchSize ?? 10;
        this.maxAttempts = options.maxAttempts ?? 5;
        this.baseBackoffMs = options.baseBackoffMs ?? 5000;
        this.signatureHeader = options.signatureHeader ?? 'X-Webhook-Signature';
        this.idempotencyHeader = options.idempotencyHeader ?? 'Idempotency-Key';
        this.eventHeader = options.eventHeader ?? 'X-Webhook-Event';
        this.metrics = options.metrics ?? new NoopMetrics();
        this.httpClient = options.httpClient ?? axios_1.default.create();
    }
    async processOnce() {
        const dueDeliveries = await this.repository.getDueDeliveries(this.batchSize);
        for (const delivery of dueDeliveries) {
            await this.processDelivery(delivery);
        }
    }
    calculateBackoff(attemptNumber) {
        const jitter = Math.random() * 0.25 + 0.75; // 25% jitter
        return Math.min(this.baseBackoffMs * 2 ** (attemptNumber - 1) * jitter, 15 * 60 * 1000);
    }
    async processDelivery(delivery) {
        const subscription = await this.repository.getSubscription(delivery.subscriptionId);
        if (!subscription || !subscription.isActive) {
            await this.repository.markDeliveryStatus(delivery.id, 'dead', delivery.attemptCount, 'Subscription missing or inactive', null);
            this.metrics.recordDeadLetter('Subscription missing or inactive');
            return;
        }
        const payload = delivery.payload;
        const signature = this.service.generateSignature(payload, subscription.secret);
        const started = Date.now();
        let status = 'succeeded';
        let error;
        let responseStatus;
        let responseBody;
        try {
            const response = await this.httpClient.post(subscription.targetUrl, payload, {
                headers: {
                    [this.signatureHeader]: signature,
                    [this.idempotencyHeader]: delivery.idempotencyKey,
                    [this.eventHeader]: delivery.eventType,
                },
                timeout: 10000,
            });
            responseStatus = response.status;
            responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            if (response.status >= 400) {
                throw new Error(`Unexpected status code ${response.status}`);
            }
            this.metrics.recordSuccess(Date.now() - started);
            await this.repository.markDeliveryStatus(delivery.id, 'succeeded', delivery.attemptCount + 1, undefined, null);
        }
        catch (err) {
            const attemptNumber = delivery.attemptCount + 1;
            status = attemptNumber >= this.maxAttempts ? 'dead' : 'failed';
            error = err?.message || 'Webhook delivery failed';
            if (err?.response) {
                responseStatus = err.response.status;
                responseBody = typeof err.response.data === 'string'
                    ? err.response.data
                    : JSON.stringify(err.response.data);
            }
            const backoffMs = this.calculateBackoff(attemptNumber);
            const nextAttempt = status === 'failed' ? new Date(Date.now() + backoffMs) : null;
            await this.repository.markDeliveryStatus(delivery.id, status, attemptNumber, error, nextAttempt);
            if (status === 'dead') {
                this.metrics.recordDeadLetter(error ?? 'Unknown error');
                logger_1.logger.error('webhook.dead_letter', { deliveryId: delivery.id, error });
            }
            else {
                this.metrics.recordFailure(Date.now() - started);
                logger_1.logger.warn('webhook.delivery_retry', {
                    deliveryId: delivery.id,
                    attemptNumber,
                    nextAttempt,
                });
            }
        }
        finally {
            const duration = Date.now() - started;
            await this.repository.recordAttempt({
                deliveryId: delivery.id,
                responseStatus,
                responseBody,
                error,
                durationMs: duration,
                attemptNumber: delivery.attemptCount + 1,
            });
        }
    }
}
exports.WebhookDeliveryWorker = WebhookDeliveryWorker;
