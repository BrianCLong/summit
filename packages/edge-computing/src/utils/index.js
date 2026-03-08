"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoundRobinBalancer = exports.PriorityQueue = void 0;
exports.calculateDistance = calculateDistance;
exports.calculateResourceScore = calculateResourceScore;
exports.formatBytes = formatBytes;
exports.formatUptime = formatUptime;
exports.generateEdgeId = generateEdgeId;
exports.retryWithBackoff = retryWithBackoff;
exports.sleep = sleep;
exports.validateNodeHealth = validateNodeHealth;
exports.estimateTransferTime = estimateTransferTime;
/**
 * Calculate distance between two geographic locations using Haversine formula
 * @param loc1 First location
 * @param loc2 Second location
 * @returns Distance in kilometers
 */
function calculateDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(loc2.latitude - loc1.latitude);
    const dLon = toRadians(loc2.longitude - loc1.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(loc1.latitude)) *
            Math.cos(toRadians(loc2.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}
/**
 * Calculate resource utilization score (0-100)
 * Higher score means more resources available
 */
function calculateResourceScore(capacity) {
    const cpuScore = 100 - capacity.cpu.utilization;
    const memoryScore = 100 - capacity.memory.utilization;
    const storageScore = 100 - capacity.storage.utilization;
    const networkScore = Math.max(0, 100 - (capacity.network.latency / 10));
    // Weighted average
    return (cpuScore * 0.3 +
        memoryScore * 0.3 +
        storageScore * 0.2 +
        networkScore * 0.2);
}
/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
/**
 * Format uptime to human readable format
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (secs > 0 || parts.length === 0) {
        parts.push(`${secs}s`);
    }
    return parts.join(' ');
}
/**
 * Generate unique identifier for edge resources
 */
function generateEdgeId(prefix = 'edge') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000, maxDelay = 30000) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
                await sleep(delay);
            }
        }
    }
    throw lastError || new Error('Retry failed');
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Validate edge node health based on metrics
 */
function validateNodeHealth(capacity, lastHeartbeat) {
    const issues = [];
    const now = Date.now();
    const heartbeatAge = now - lastHeartbeat.getTime();
    // Check heartbeat freshness (should be within 60 seconds)
    if (heartbeatAge > 60000) {
        issues.push(`Heartbeat stale (${Math.floor(heartbeatAge / 1000)}s old)`);
    }
    // Check CPU utilization
    if (capacity.cpu.utilization > 90) {
        issues.push(`High CPU utilization (${capacity.cpu.utilization.toFixed(1)}%)`);
    }
    // Check memory utilization
    if (capacity.memory.utilization > 90) {
        issues.push(`High memory utilization (${capacity.memory.utilization.toFixed(1)}%)`);
    }
    // Check storage utilization
    if (capacity.storage.utilization > 85) {
        issues.push(`High storage utilization (${capacity.storage.utilization.toFixed(1)}%)`);
    }
    // Check network latency
    if (capacity.network.latency > 100) {
        issues.push(`High network latency (${capacity.network.latency.toFixed(0)}ms)`);
    }
    // Check packet loss
    if (capacity.network.packetLoss > 5) {
        issues.push(`High packet loss (${capacity.network.packetLoss.toFixed(1)}%)`);
    }
    return {
        isHealthy: issues.length === 0,
        issues
    };
}
/**
 * Calculate estimated network transfer time
 */
function estimateTransferTime(sizeBytes, bandwidthBps) {
    // Convert to seconds, add 10% overhead
    return (sizeBytes * 8) / bandwidthBps * 1.1;
}
/**
 * Priority queue implementation for task scheduling
 */
class PriorityQueue {
    items = [];
    enqueue(value, priority) {
        this.items.push({ priority, value });
        this.items.sort((a, b) => b.priority - a.priority);
    }
    dequeue() {
        return this.items.shift()?.value;
    }
    peek() {
        return this.items[0]?.value;
    }
    size() {
        return this.items.length;
    }
    isEmpty() {
        return this.items.length === 0;
    }
    clear() {
        this.items = [];
    }
}
exports.PriorityQueue = PriorityQueue;
/**
 * Round-robin load balancer
 */
class RoundRobinBalancer {
    items;
    currentIndex = 0;
    constructor(items) {
        this.items = [...items];
    }
    next() {
        if (this.items.length === 0) {
            return undefined;
        }
        const item = this.items[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        return item;
    }
    add(item) {
        this.items.push(item);
    }
    remove(item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
            if (this.currentIndex >= this.items.length) {
                this.currentIndex = 0;
            }
            return true;
        }
        return false;
    }
    size() {
        return this.items.length;
    }
}
exports.RoundRobinBalancer = RoundRobinBalancer;
