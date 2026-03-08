"use strict";
/**
 * Satellite Communications Handler
 * Manages satellite link communications for denied/degraded environments
 * Supports store-and-forward, bandwidth optimization, and priority queuing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SatelliteCommHandler = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class SatelliteCommHandler extends eventemitter3_1.EventEmitter {
    links = new Map();
    messageQueue = new Map(); // per priority
    storeForwardBuffer = [];
    windowTimers = new Map();
    MAX_QUEUE_SIZE = 1000;
    MAX_STORE_FORWARD_SIZE = 5000;
    FLASH_PRIORITY_BANDWIDTH_PERCENT = 0.4;
    IMMEDIATE_PRIORITY_BANDWIDTH_PERCENT = 0.3;
    constructor() {
        super();
        this.initializeQueues();
    }
    initializeQueues() {
        this.messageQueue.set('flash', []);
        this.messageQueue.set('immediate', []);
        this.messageQueue.set('priority', []);
        this.messageQueue.set('routine', []);
    }
    /**
     * Register a satellite link
     */
    registerLink(link) {
        const fullLink = {
            ...link,
            id: (0, uuid_1.v4)(),
        };
        this.links.set(fullLink.id, fullLink);
        if (link.linkState === 'connected') {
            this.emit('link:acquired', fullLink);
            this.startTransmission(fullLink.id);
        }
        if (link.nextWindow) {
            this.scheduleWindow(fullLink);
        }
        logger_js_1.logger.info('Satellite link registered', {
            linkId: fullLink.id,
            constellation: fullLink.constellation,
            state: fullLink.linkState,
        });
        return fullLink;
    }
    /**
     * Update link state
     */
    updateLinkState(linkId, state, metrics) {
        const link = this.links.get(linkId);
        if (!link) {
            return;
        }
        const previousState = link.linkState;
        link.linkState = state;
        if (metrics) {
            Object.assign(link, metrics);
        }
        if (state === 'connected' && previousState !== 'connected') {
            this.emit('link:acquired', link);
            this.startTransmission(linkId);
            this.drainStoreForwardBuffer(linkId);
        }
        else if (state === 'lost' && previousState !== 'lost') {
            this.emit('link:lost', linkId);
            this.stopTransmission(linkId);
        }
        else if (state === 'degraded') {
            this.emit('link:degraded', linkId, 'Link quality degraded');
        }
    }
    /**
     * Queue a message for transmission
     */
    queueMessage(priority, payload, destination, ttlSeconds) {
        const message = {
            id: (0, uuid_1.v4)(),
            priority,
            payload,
            destination,
            timestamp: new Date(),
            retries: 0,
            maxRetries: priority === 'flash' ? 10 : priority === 'immediate' ? 5 : 3,
            expiresAt: ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : undefined,
        };
        const queue = this.messageQueue.get(priority);
        if (queue && queue.length < this.MAX_QUEUE_SIZE) {
            queue.push(message);
            this.processQueues();
            return message.id;
        }
        // Queue full - store for later if not flash priority
        if (priority !== 'flash' && this.storeForwardBuffer.length < this.MAX_STORE_FORWARD_SIZE) {
            this.storeForwardBuffer.push(message);
            logger_js_1.logger.warn('Message added to store-forward buffer', { messageId: message.id });
            return message.id;
        }
        logger_js_1.logger.error('Message rejected - queues full', { priority, destination });
        throw new Error('Message queue full');
    }
    /**
     * Get best available link for transmission
     */
    getBestLink() {
        let bestLink = null;
        let bestScore = -1;
        for (const link of this.links.values()) {
            if (link.linkState !== 'connected') {
                continue;
            }
            // Score based on bandwidth, latency, and packet loss
            const score = link.bandwidthKbps / 100 -
                link.latencyMs / 1000 -
                link.packetLossPercent * 10;
            if (score > bestScore) {
                bestScore = score;
                bestLink = link;
            }
        }
        return bestLink;
    }
    /**
     * Get available bandwidth across all connected links
     */
    getTotalBandwidth() {
        let total = 0;
        for (const link of this.links.values()) {
            if (link.linkState === 'connected') {
                total += link.bandwidthKbps;
            }
        }
        return total;
    }
    /**
     * Check if any link is available
     */
    hasConnectivity() {
        for (const link of this.links.values()) {
            if (link.linkState === 'connected' || link.linkState === 'degraded') {
                return true;
            }
        }
        return false;
    }
    /**
     * Get next scheduled communication window
     */
    getNextWindow() {
        let earliest = null;
        for (const link of this.links.values()) {
            if (link.linkState === 'scheduled' && link.nextWindow) {
                if (!earliest || link.nextWindow < earliest.time) {
                    earliest = {
                        linkId: link.id,
                        time: link.nextWindow,
                        durationMinutes: link.windowDurationMinutes ?? 15,
                    };
                }
            }
        }
        return earliest;
    }
    scheduleWindow(link) {
        if (!link.nextWindow) {
            return;
        }
        const msUntilWindow = link.nextWindow.getTime() - Date.now();
        if (msUntilWindow <= 0) {
            return;
        }
        // Clear existing timer
        const existing = this.windowTimers.get(link.id);
        if (existing) {
            clearTimeout(existing);
        }
        // Schedule window opening
        const timer = setTimeout(() => {
            this.updateLinkState(link.id, 'connected');
            this.emit('window:opening', link.id, link.windowDurationMinutes ?? 15);
            // Schedule window closing
            const closingTimer = setTimeout(() => {
                this.emit('window:closing', link.id, 60);
                setTimeout(() => {
                    this.updateLinkState(link.id, 'scheduled');
                }, 60000);
            }, ((link.windowDurationMinutes ?? 15) - 1) * 60000);
            this.windowTimers.set(`${link.id}-close`, closingTimer);
        }, msUntilWindow);
        this.windowTimers.set(link.id, timer);
    }
    async processQueues() {
        const link = this.getBestLink();
        if (!link) {
            return;
        }
        const bandwidth = link.bandwidthKbps * 1024 / 8; // bytes per second
        // Allocate bandwidth by priority
        await this.transmitFromQueue('flash', bandwidth * this.FLASH_PRIORITY_BANDWIDTH_PERCENT, link);
        await this.transmitFromQueue('immediate', bandwidth * this.IMMEDIATE_PRIORITY_BANDWIDTH_PERCENT, link);
        await this.transmitFromQueue('priority', bandwidth * 0.2, link);
        await this.transmitFromQueue('routine', bandwidth * 0.1, link);
    }
    async transmitFromQueue(priority, availableBytes, link) {
        const queue = this.messageQueue.get(priority);
        if (!queue || queue.length === 0) {
            return;
        }
        let bytesUsed = 0;
        const toRemove = [];
        for (const message of queue) {
            // Check expiration
            if (message.expiresAt && new Date() > message.expiresAt) {
                toRemove.push(message.id);
                this.emit('message:failed', message.id, 'Message expired');
                continue;
            }
            // Check if we have bandwidth
            if (bytesUsed + message.payload.length > availableBytes) {
                break;
            }
            // Simulate transmission
            const success = await this.transmitMessage(message, link);
            if (success) {
                toRemove.push(message.id);
                bytesUsed += message.payload.length;
                this.emit('message:sent', message.id);
            }
            else {
                message.retries++;
                if (message.retries >= message.maxRetries) {
                    toRemove.push(message.id);
                    this.emit('message:failed', message.id, 'Max retries exceeded');
                }
            }
        }
        // Remove processed messages
        for (const id of toRemove) {
            const idx = queue.findIndex(m => m.id === id);
            if (idx >= 0) {
                queue.splice(idx, 1);
            }
        }
    }
    async transmitMessage(message, link) {
        // Simulate packet loss
        if (Math.random() * 100 < link.packetLossPercent) {
            return false;
        }
        // Simulate transmission delay
        const transmitTime = (message.payload.length / (link.bandwidthKbps * 128)) * 1000;
        await new Promise(resolve => setTimeout(resolve, transmitTime + link.latencyMs));
        return true;
    }
    drainStoreForwardBuffer(linkId) {
        logger_js_1.logger.info('Draining store-forward buffer', { count: this.storeForwardBuffer.length });
        for (const message of this.storeForwardBuffer) {
            const queue = this.messageQueue.get(message.priority);
            if (queue && queue.length < this.MAX_QUEUE_SIZE) {
                queue.push(message);
            }
        }
        this.storeForwardBuffer = [];
        this.processQueues();
    }
    transmissionIntervals = new Map();
    startTransmission(linkId) {
        if (this.transmissionIntervals.has(linkId)) {
            return;
        }
        const interval = setInterval(() => {
            this.processQueues();
        }, 1000);
        this.transmissionIntervals.set(linkId, interval);
    }
    stopTransmission(linkId) {
        const interval = this.transmissionIntervals.get(linkId);
        if (interval) {
            clearInterval(interval);
            this.transmissionIntervals.delete(linkId);
        }
    }
    /**
     * Get queue statistics
     */
    getQueueStats() {
        const stats = {};
        for (const [priority, queue] of this.messageQueue) {
            stats[priority] = {
                count: queue.length,
                oldestTimestamp: queue[0]?.timestamp,
            };
        }
        stats['store-forward'] = {
            count: this.storeForwardBuffer.length,
            oldestTimestamp: this.storeForwardBuffer[0]?.timestamp,
        };
        return stats;
    }
    dispose() {
        for (const timer of this.windowTimers.values()) {
            clearTimeout(timer);
        }
        for (const interval of this.transmissionIntervals.values()) {
            clearInterval(interval);
        }
        this.windowTimers.clear();
        this.transmissionIntervals.clear();
        this.removeAllListeners();
    }
}
exports.SatelliteCommHandler = SatelliteCommHandler;
