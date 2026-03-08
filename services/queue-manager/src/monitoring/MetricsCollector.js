"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const prom_client_1 = require("prom-client");
class MetricsCollector {
    registry;
    jobsAdded;
    jobsProcessing;
    jobsCompleted;
    jobsFailed;
    jobProcessingDuration;
    jobsRetried;
    leaseExpired;
    deadLettered;
    queueMetrics = new Map();
    constructor() {
        this.registry = new prom_client_1.Registry();
        this.jobsAdded = new prom_client_1.Counter({
            name: 'queue_jobs_added_total',
            help: 'Total number of jobs added to queues',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.jobsProcessing = new prom_client_1.Gauge({
            name: 'queue_jobs_processing',
            help: 'Number of jobs currently being processed',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.jobsCompleted = new prom_client_1.Counter({
            name: 'queue_jobs_completed_total',
            help: 'Total number of jobs completed',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.jobsFailed = new prom_client_1.Counter({
            name: 'queue_jobs_failed_total',
            help: 'Total number of jobs failed',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.jobProcessingDuration = new prom_client_1.Histogram({
            name: 'queue_job_processing_duration_ms',
            help: 'Job processing duration in milliseconds',
            labelNames: ['queue'],
            buckets: [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000],
            registers: [this.registry],
        });
        this.jobsRetried = new prom_client_1.Counter({
            name: 'queue_jobs_retried_total',
            help: 'Total number of job retries',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.leaseExpired = new prom_client_1.Counter({
            name: 'queue_job_lease_expired_total',
            help: 'Total number of lease expirations while processing jobs',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.deadLettered = new prom_client_1.Counter({
            name: 'queue_jobs_dead_letter_total',
            help: 'Total number of jobs sent to dead-letter queue',
            labelNames: ['queue'],
            registers: [this.registry],
        });
    }
    recordJobAdded(queueName, count = 1) {
        this.jobsAdded.inc({ queue: queueName }, count);
        this.initQueueMetrics(queueName);
        this.queueMetrics.get(queueName).total += count;
    }
    recordJobStart(queueName) {
        this.jobsProcessing.inc({ queue: queueName });
        this.initQueueMetrics(queueName);
    }
    recordJobComplete(queueName, duration) {
        this.jobsProcessing.dec({ queue: queueName });
        this.jobsCompleted.inc({ queue: queueName });
        this.jobProcessingDuration.observe({ queue: queueName }, duration);
        const metrics = this.queueMetrics.get(queueName);
        if (metrics) {
            metrics.processingTimes.push(duration);
            metrics.throughput.push(Date.now());
            // Keep only last 1000 data points
            if (metrics.processingTimes.length > 1000) {
                metrics.processingTimes.shift();
            }
            if (metrics.throughput.length > 1000) {
                metrics.throughput.shift();
            }
        }
    }
    recordJobFailed(queueName, duration) {
        this.jobsProcessing.dec({ queue: queueName });
        this.jobsFailed.inc({ queue: queueName });
        this.jobProcessingDuration.observe({ queue: queueName }, duration);
        const metrics = this.queueMetrics.get(queueName);
        if (metrics) {
            metrics.errors++;
        }
    }
    recordJobRetry(queueName) {
        this.jobsRetried.inc({ queue: queueName });
        this.initQueueMetrics(queueName);
        this.queueMetrics.get(queueName).retries++;
    }
    recordLeaseExpired(queueName) {
        this.leaseExpired.inc({ queue: queueName });
        this.initQueueMetrics(queueName);
        this.queueMetrics.get(queueName).leaseExpirations++;
    }
    recordDeadLetter(queueName) {
        this.deadLettered.inc({ queue: queueName });
        this.initQueueMetrics(queueName);
        this.queueMetrics.get(queueName).deadLetters++;
    }
    getQueueMetrics(queueName) {
        const metrics = this.queueMetrics.get(queueName);
        if (!metrics) {
            return {
                throughput: 0,
                avgProcessingTime: 0,
                errorRate: 0,
                deadLetterRate: 0,
                retries: 0,
                leaseExpirations: 0,
                deadLetters: 0,
            };
        }
        // Calculate throughput (jobs per minute)
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentJobs = metrics.throughput.filter((t) => t > oneMinuteAgo);
        const throughput = recentJobs.length;
        // Calculate average processing time
        const avgProcessingTime = metrics.processingTimes.length > 0
            ? metrics.processingTimes.reduce((a, b) => a + b, 0) /
                metrics.processingTimes.length
            : 0;
        // Calculate error rate
        const errorRate = metrics.total > 0 ? (metrics.errors / metrics.total) * 100 : 0;
        const deadLetterRate = metrics.total > 0 ? (metrics.deadLetters / metrics.total) * 100 : 0;
        return {
            throughput,
            avgProcessingTime: Math.round(avgProcessingTime),
            errorRate: Math.round(errorRate * 100) / 100,
            deadLetterRate: Math.round(deadLetterRate * 100) / 100,
            retries: metrics.retries,
            leaseExpirations: metrics.leaseExpirations,
            deadLetters: metrics.deadLetters,
        };
    }
    getPrometheusMetrics() {
        return this.registry.metrics();
    }
    getRegistry() {
        return this.registry;
    }
    initQueueMetrics(queueName) {
        if (!this.queueMetrics.has(queueName)) {
            this.queueMetrics.set(queueName, {
                throughput: [],
                processingTimes: [],
                errors: 0,
                total: 0,
                retries: 0,
                leaseExpirations: 0,
                deadLetters: 0,
            });
        }
    }
}
exports.MetricsCollector = MetricsCollector;
