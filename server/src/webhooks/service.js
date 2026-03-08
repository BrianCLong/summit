"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
exports.backoffForAttempt = backoffForAttempt;
exports.processDelivery = processDelivery;
exports.registerWebhookWorker = registerWebhookWorker;
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const config_js_1 = require("../queues/config.js");
const metrics_js_1 = require("./metrics.js");
const repository_js_1 = require("./repository.js");
const signature_js_1 = require("./signature.js");
const types_js_1 = require("./types.js");
const MAX_ATTEMPTS = parseInt(process.env.WEBHOOK_MAX_ATTEMPTS || '5', 10);
const INITIAL_BACKOFF_MS = parseInt(process.env.WEBHOOK_BACKOFF_MS || '2000', 10);
class WebhookService {
    repository;
    httpClient;
    constructor(repository = repository_js_1.webhookRepository, httpClient = axios_1.default) {
        this.repository = repository;
        this.httpClient = httpClient;
    }
    async enqueueEvent(tenantId, eventType, payload, idempotencyKey) {
        const subscriptions = await this.repository.getSubscriptionsForEvent(tenantId, eventType);
        if (!subscriptions.length) {
            logger_js_1.default.warn('No webhook subscriptions registered', {
                tenantId,
                eventType,
            });
            return [];
        }
        const jobs = [];
        for (const subscription of subscriptions) {
            const existing = await this.repository.findDeliveryByKey(tenantId, subscription.id, idempotencyKey);
            if (existing && existing.status === types_js_1.DeliveryStatus.SUCCEEDED) {
                logger_js_1.default.info('Skipping duplicate webhook delivery', {
                    tenantId,
                    subscriptionId: subscription.id,
                    idempotencyKey,
                });
                continue;
            }
            const delivery = existing ??
                (await this.repository.createDelivery({
                    tenantId,
                    subscriptionId: subscription.id,
                    eventType,
                    payload,
                    idempotencyKey,
                    nextAttemptAt: new Date(),
                }));
            const job = {
                deliveryId: delivery.id,
                tenantId,
                subscriptionId: subscription.id,
                eventType,
                targetUrl: subscription.target_url,
                secret: subscription.secret,
                payload,
                idempotencyKey,
            };
            jobs.push(job);
            await (0, config_js_1.addJob)(config_js_1.QueueName.WEBHOOKS, 'deliver-webhook', job, {
                attempts: MAX_ATTEMPTS,
                delay: 0,
                removeOnFail: false,
                priority: undefined,
            });
        }
        return jobs;
    }
}
exports.WebhookService = WebhookService;
function backoffForAttempt(attempt) {
    return INITIAL_BACKOFF_MS * Math.pow(2, Math.max(0, attempt - 1));
}
async function processDelivery(job, attemptsMade, repository = repository_js_1.webhookRepository, httpClient = axios_1.default) {
    const started = Date.now();
    await repository.markInProgress(job.tenantId, job.deliveryId);
    const timestamp = Date.now();
    const signature = (0, signature_js_1.signPayload)(job.secret, job.payload, timestamp, job.idempotencyKey);
    const attemptNumber = attemptsMade + 1;
    const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Id': job.deliveryId,
        'Idempotency-Key': job.idempotencyKey,
        'X-Tenant-Id': job.tenantId,
        'X-Webhook-Event': job.eventType,
    };
    try {
        const response = await httpClient.post(job.targetUrl, job.payload, {
            headers,
            timeout: 10000,
            validateStatus: () => true,
        });
        await repository.recordAttempt(job.tenantId, job.deliveryId, attemptNumber, types_js_1.DeliveryStatus.SUCCEEDED, response.status, typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data ?? {}), undefined, Date.now() - started);
        if (response.status >= 200 && response.status < 300) {
            await repository.markSuccess(job.tenantId, job.deliveryId, attemptNumber);
            (0, metrics_js_1.recordDeliveryMetric)(job.eventType, 'success', (Date.now() - started) / 1000);
            return 'delivered';
        }
        throw new Error(`Non-success status ${response.status}`);
    }
    catch (error) {
        const poison = attemptNumber >= MAX_ATTEMPTS;
        const backoffMs = backoffForAttempt(attemptNumber);
        const errorMessage = error?.message || 'Webhook delivery failed';
        await repository.recordAttempt(job.tenantId, job.deliveryId, attemptNumber, poison ? types_js_1.DeliveryStatus.POISONED : types_js_1.DeliveryStatus.FAILED, undefined, undefined, errorMessage, Date.now() - started);
        await repository.markFailure(job.tenantId, job.deliveryId, attemptNumber, errorMessage, poison, poison ? undefined : new Date(Date.now() + backoffMs));
        (0, metrics_js_1.recordDeliveryMetric)(job.eventType, poison ? 'poison' : 'failure');
        if (poison) {
            logger_js_1.default.error('Webhook delivery poisoned, moving to dead letter', {
                deliveryId: job.deliveryId,
                tenantId: job.tenantId,
                attemptNumber,
            });
            return 'poisoned';
        }
        throw error;
    }
}
function registerWebhookWorker() {
    return config_js_1.queueRegistry.registerWorker(config_js_1.QueueName.WEBHOOKS, async (bullJob) => {
        return processDelivery(bullJob.data, bullJob.attemptsMade);
    }, {
        concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '5', 10),
        backoffStrategy: (attempts) => backoffForAttempt(attempts + 1),
    });
}
