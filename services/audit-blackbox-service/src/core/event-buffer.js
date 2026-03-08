"use strict";
// @ts-nocheck
/**
 * Audit Event Buffer
 *
 * In-memory buffer with backpressure handling for audit events.
 * Ensures no event loss during high load while preventing memory exhaustion.
 *
 * Features:
 * - Configurable buffer size with backpressure
 * - Priority queuing for critical events
 * - Automatic flush on buffer full or interval
 * - Graceful degradation under load
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditEventBuffer = void 0;
const events_1 = require("events");
/**
 * Event buffer with backpressure handling
 */
class AuditEventBuffer extends events_1.EventEmitter {
    criticalQueue = [];
    normalQueue = [];
    config;
    flushTimer = null;
    flushing = false;
    backpressureActive = false;
    // Statistics
    stats = {
        totalReceived: 0,
        totalFlushed: 0,
        totalDropped: 0,
        lastFlushTime: null,
        flushDurations: [],
    };
    constructor(config) {
        super();
        this.config = config;
        this.startFlushTimer();
    }
    /**
     * Add an event to the buffer
     */
    async push(event) {
        this.stats.totalReceived++;
        const isCritical = this.isCriticalEvent(event);
        const currentSize = this.size();
        // Check backpressure
        if (currentSize >= this.config.maxSize * this.config.backpressureThreshold) {
            if (!this.backpressureActive) {
                this.backpressureActive = true;
                this.emit('backpressure', true);
                this.config.onBackpressure?.(true);
            }
        }
        // Critical events bypass backpressure if configured
        if (isCritical && this.config.criticalEventsBypass) {
            this.criticalQueue.push({
                event,
                priority: 'critical',
                receivedAt: new Date(),
            });
            return true;
        }
        // Check if buffer is full
        if (currentSize >= this.config.maxSize) {
            this.stats.totalDropped++;
            this.config.onDrop?.(event, 'buffer_full');
            this.emit('dropped', { event, reason: 'buffer_full' });
            // Trigger immediate flush
            this.flush().catch((err) => {
                this.emit('error', err);
            });
            return false;
        }
        // Add to appropriate queue
        if (isCritical) {
            this.criticalQueue.push({
                event,
                priority: 'critical',
                receivedAt: new Date(),
            });
        }
        else {
            this.normalQueue.push({
                event,
                priority: 'normal',
                receivedAt: new Date(),
            });
        }
        // Check if we should flush immediately
        if (currentSize + 1 >= this.config.batchSize) {
            this.flush().catch((err) => {
                this.emit('error', err);
            });
        }
        return true;
    }
    /**
     * Flush events to the store
     */
    async flush() {
        if (this.flushing) {
            return 0;
        }
        this.flushing = true;
        const startTime = Date.now();
        try {
            // Prioritize critical events
            const eventsToFlush = [];
            const itemsToRequeue = [];
            // Take all critical events first
            while (this.criticalQueue.length > 0 &&
                eventsToFlush.length < this.config.batchSize) {
                const item = this.criticalQueue.shift();
                if (item) {
                    itemsToRequeue.push(item);
                    eventsToFlush.push(item.event);
                }
            }
            // Then fill with normal events
            while (this.normalQueue.length > 0 &&
                eventsToFlush.length < this.config.batchSize) {
                const item = this.normalQueue.shift();
                if (item) {
                    itemsToRequeue.push(item);
                    eventsToFlush.push(item.event);
                }
            }
            if (eventsToFlush.length === 0) {
                return 0;
            }
            // Flush to store
            await this.config.onFlush(eventsToFlush);
            const duration = Date.now() - startTime;
            this.stats.totalFlushed += eventsToFlush.length;
            this.stats.lastFlushTime = new Date();
            this.stats.flushDurations.push(duration);
            // Keep only last 100 durations for average calculation
            if (this.stats.flushDurations.length > 100) {
                this.stats.flushDurations.shift();
            }
            // Check if we can release backpressure
            if (this.backpressureActive) {
                const currentSize = this.size();
                if (currentSize < this.config.maxSize * this.config.backpressureThreshold * 0.5) {
                    this.backpressureActive = false;
                    this.emit('backpressure', false);
                    this.config.onBackpressure?.(false);
                }
            }
            this.emit('flushed', {
                count: eventsToFlush.length,
                duration,
                remaining: this.size(),
            });
            return eventsToFlush.length;
        }
        catch (error) {
            // On failure, re-add events to front of queues
            // Note: In production, you might want more sophisticated retry logic
            for (let i = itemsToRequeue.length - 1; i >= 0; i--) {
                const item = itemsToRequeue[i];
                if (item.priority === 'critical') {
                    this.criticalQueue.unshift(item);
                }
                else {
                    this.normalQueue.unshift(item);
                }
            }
            this.emit('error', error);
            throw error;
        }
        finally {
            this.flushing = false;
        }
    }
    /**
     * Get current buffer size
     */
    size() {
        return this.criticalQueue.length + this.normalQueue.length;
    }
    /**
     * Get buffer statistics
     */
    getStats() {
        const avgDuration = this.stats.flushDurations.length > 0
            ? this.stats.flushDurations.reduce((a, b) => a + b, 0) /
                this.stats.flushDurations.length
            : 0;
        return {
            size: this.size(),
            maxSize: this.config.maxSize,
            criticalQueueSize: this.criticalQueue.length,
            normalQueueSize: this.normalQueue.length,
            totalReceived: this.stats.totalReceived,
            totalFlushed: this.stats.totalFlushed,
            totalDropped: this.stats.totalDropped,
            backpressureActive: this.backpressureActive,
            lastFlushTime: this.stats.lastFlushTime,
            avgFlushDuration: avgDuration,
        };
    }
    /**
     * Check if an event is critical
     */
    isCriticalEvent(event) {
        // Critical if explicitly marked
        if (event.criticalCategory) {
            return true;
        }
        // Critical levels
        if (event.level === 'critical' || event.level === 'error') {
            return true;
        }
        // Compliance-relevant events
        if (event.complianceRelevant) {
            return true;
        }
        // Security events
        const securityEventTypes = [
            'security_alert',
            'anomaly_detected',
            'data_breach',
            'intrusion_detected',
            'access_denied',
            'brute_force_detected',
        ];
        if (securityEventTypes.includes(event.eventType)) {
            return true;
        }
        return false;
    }
    /**
     * Start the periodic flush timer
     */
    startFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flushTimer = setInterval(() => {
            if (this.size() > 0) {
                this.flush().catch((err) => {
                    this.emit('error', err);
                });
            }
        }, this.config.flushIntervalMs);
    }
    /**
     * Stop the flush timer and flush remaining events
     */
    async shutdown() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Flush all remaining events
        while (this.size() > 0) {
            await this.flush();
        }
    }
}
exports.AuditEventBuffer = AuditEventBuffer;
