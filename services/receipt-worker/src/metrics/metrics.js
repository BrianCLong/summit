"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptWorkerMetrics = void 0;
const prom_client_1 = require("prom-client");
class ReceiptWorkerMetrics {
    registry;
    queueLagSeconds;
    dlqDepthGauge;
    retryCounter;
    dlqCounter;
    successCounter;
    constructor(registry) {
        this.registry = registry ?? new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry });
        this.queueLagSeconds = new prom_client_1.Gauge({
            name: 'receipt_queue_lag_seconds',
            help: 'Time spent in the queue before processing (seconds).',
            registers: [this.registry],
        });
        this.dlqDepthGauge = new prom_client_1.Gauge({
            name: 'receipt_dlq_depth',
            help: 'Number of messages currently in the dead-letter queue.',
            registers: [this.registry],
        });
        this.retryCounter = new prom_client_1.Counter({
            name: 'receipt_retry_total',
            help: 'Number of retries triggered by transient failures.',
            registers: [this.registry],
        });
        this.dlqCounter = new prom_client_1.Counter({
            name: 'receipt_dlq_total',
            help: 'Total messages routed to the dead-letter queue.',
            registers: [this.registry],
        });
        this.successCounter = new prom_client_1.Counter({
            name: 'receipt_processed_total',
            help: 'Total successfully processed receipt messages.',
            registers: [this.registry],
        });
    }
    observeLag(seconds) {
        this.queueLagSeconds.set(seconds);
    }
    recordRetry() {
        this.retryCounter.inc();
    }
    recordSuccess() {
        this.successCounter.inc();
    }
    recordDlq(depth) {
        this.dlqCounter.inc();
        this.updateDlqDepth(depth);
    }
    updateDlqDepth(depth) {
        this.dlqDepthGauge.set(depth);
    }
    getRegistry() {
        return this.registry;
    }
    async getLatestLag() {
        const values = (await this.queueLagSeconds.get()).values?.[0];
        return values?.value ?? 0;
    }
    async getDlqDepth() {
        const values = (await this.dlqDepthGauge.get()).values?.[0];
        return values?.value ?? 0;
    }
}
exports.ReceiptWorkerMetrics = ReceiptWorkerMetrics;
