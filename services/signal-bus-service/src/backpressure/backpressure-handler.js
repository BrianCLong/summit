"use strict";
/**
 * Backpressure Handler
 *
 * Manages backpressure in the signal processing pipeline.
 * Features:
 * - Bounded in-memory queue with configurable limits
 * - Spill-to-disk when queue fills up
 * - Automatic pause/resume of consumers
 * - Lag metrics per partition and tenant
 *
 * @module backpressure
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureHandler = void 0;
exports.createBackpressureHandler = createBackpressureHandler;
const events_1 = require("events");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Default configuration
 */
const defaultConfig = {
    maxQueueSize: 10000,
    highWaterMark: 8000,
    lowWaterMark: 2000,
    spillToDisk: true,
    spillDirectory: '/tmp/signal-bus-spill',
    maxSpillSizeBytes: 1073741824, // 1GB
    pauseOnHighWaterMark: true,
};
/**
 * Backpressure Handler class
 */
class BackpressureHandler extends events_1.EventEmitter {
    config;
    logger;
    queue = [];
    spilledFiles = [];
    spilledCount = 0;
    spilledBytes = 0;
    pausedPartitions = new Set();
    isHighWaterMarkActive = false;
    lastStateChange = Date.now();
    partitionLags = new Map();
    constructor(logger, config) {
        super();
        this.logger = logger.child({ component: 'backpressure-handler' });
        this.config = { ...defaultConfig, ...config };
        this.initializeSpillDirectory().catch((error) => {
            this.logger.error({ error }, 'Failed to initialize spill directory');
        });
    }
    /**
     * Initialize the spill directory
     */
    async initializeSpillDirectory() {
        if (!this.config.spillToDisk)
            return;
        try {
            await fs.mkdir(this.config.spillDirectory, { recursive: true });
            this.logger.info({ directory: this.config.spillDirectory }, 'Spill directory initialized');
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to create spill directory');
            throw error;
        }
    }
    /**
     * Enqueue a signal for processing
     */
    async enqueue(signal) {
        // Check if queue is full
        if (this.queue.length >= this.config.maxQueueSize) {
            if (this.config.spillToDisk && this.spilledBytes < this.config.maxSpillSizeBytes) {
                await this.spillToDisk([signal]);
                return true;
            }
            this.emit('queueFull');
            return false;
        }
        this.queue.push(signal);
        // Check high water mark
        if (!this.isHighWaterMarkActive &&
            this.queue.length >= this.config.highWaterMark) {
            this.isHighWaterMarkActive = true;
            this.lastStateChange = Date.now();
            this.emit('highWaterMark');
            this.logger.warn({ queueSize: this.queue.length, highWaterMark: this.config.highWaterMark }, 'High water mark reached');
        }
        return true;
    }
    /**
     * Enqueue multiple signals
     */
    async enqueueBatch(signals) {
        let enqueued = 0;
        let spilled = 0;
        let dropped = 0;
        const availableSpace = this.config.maxQueueSize - this.queue.length;
        const toEnqueue = signals.slice(0, availableSpace);
        const toSpill = signals.slice(availableSpace);
        // Enqueue what fits
        this.queue.push(...toEnqueue);
        enqueued = toEnqueue.length;
        // Spill the rest
        if (toSpill.length > 0 && this.config.spillToDisk) {
            if (this.spilledBytes < this.config.maxSpillSizeBytes) {
                await this.spillToDisk(toSpill);
                spilled = toSpill.length;
            }
            else {
                dropped = toSpill.length;
            }
        }
        else if (toSpill.length > 0) {
            dropped = toSpill.length;
        }
        // Check water marks
        this.checkWaterMarks();
        return { enqueued, spilled, dropped };
    }
    /**
     * Dequeue signals for processing
     */
    async dequeue(maxCount) {
        const signals = [];
        // First, get from in-memory queue
        const fromQueue = this.queue.splice(0, maxCount);
        signals.push(...fromQueue);
        // If we need more and have spilled files, recover from disk
        if (signals.length < maxCount && this.spilledFiles.length > 0) {
            const fromDisk = await this.recoverFromDisk(maxCount - signals.length);
            signals.push(...fromDisk);
        }
        // Check low water mark
        this.checkWaterMarks();
        return signals;
    }
    /**
     * Check and emit water mark events
     */
    checkWaterMarks() {
        const currentSize = this.queue.length;
        if (!this.isHighWaterMarkActive && currentSize >= this.config.highWaterMark) {
            this.isHighWaterMarkActive = true;
            this.lastStateChange = Date.now();
            this.emit('highWaterMark');
            this.logger.warn({ queueSize: currentSize }, 'High water mark reached');
        }
        else if (this.isHighWaterMarkActive &&
            currentSize <= this.config.lowWaterMark) {
            this.isHighWaterMarkActive = false;
            this.lastStateChange = Date.now();
            this.emit('lowWaterMark');
            this.logger.info({ queueSize: currentSize }, 'Low water mark reached');
        }
    }
    /**
     * Spill signals to disk
     */
    async spillToDisk(signals) {
        if (signals.length === 0)
            return;
        const filename = `spill-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
        const filepath = path.join(this.config.spillDirectory, filename);
        const data = JSON.stringify(signals);
        await fs.writeFile(filepath, data, 'utf-8');
        this.spilledFiles.push(filepath);
        this.spilledCount += signals.length;
        this.spilledBytes += Buffer.byteLength(data, 'utf-8');
        if (this.spilledFiles.length === 1) {
            this.emit('spillStarted');
        }
        this.logger.debug({ filepath, count: signals.length, totalSpilled: this.spilledCount }, 'Spilled signals to disk');
    }
    /**
     * Recover signals from disk
     */
    async recoverFromDisk(maxCount) {
        const signals = [];
        while (signals.length < maxCount && this.spilledFiles.length > 0) {
            const filepath = this.spilledFiles.shift();
            try {
                const data = await fs.readFile(filepath, 'utf-8');
                const recovered = JSON.parse(data);
                signals.push(...recovered.slice(0, maxCount - signals.length));
                // Delete the spill file
                await fs.unlink(filepath);
                this.spilledCount -= recovered.length;
                this.spilledBytes -= Buffer.byteLength(data, 'utf-8');
                this.logger.debug({ filepath, count: recovered.length, remainingSpilled: this.spilledCount }, 'Recovered signals from disk');
            }
            catch (error) {
                this.logger.error({ error, filepath }, 'Failed to recover spill file');
                this.emit('error', error);
            }
        }
        if (this.spilledFiles.length === 0 && this.spilledCount <= 0) {
            this.spilledCount = 0;
            this.spilledBytes = 0;
            this.emit('spillEnded');
        }
        return signals;
    }
    /**
     * Pause a partition
     */
    pausePartition(partition) {
        this.pausedPartitions.add(partition);
        this.logger.debug({ partition }, 'Partition paused');
    }
    /**
     * Resume a partition
     */
    resumePartition(partition) {
        this.pausedPartitions.delete(partition);
        this.logger.debug({ partition }, 'Partition resumed');
    }
    /**
     * Check if a partition is paused
     */
    isPartitionPaused(partition) {
        return this.pausedPartitions.has(partition);
    }
    /**
     * Update lag metrics for a partition
     */
    updateLag(topic, partition, currentOffset, highWaterMark) {
        const key = `${topic}:${partition}`;
        const lag = parseInt(highWaterMark, 10) - parseInt(currentOffset, 10);
        this.partitionLags.set(key, {
            topic,
            partition,
            currentOffset,
            highWaterMark,
            lag: Math.max(0, lag),
            lastUpdated: Date.now(),
        });
    }
    /**
     * Get lag for a specific partition
     */
    getLag(topic, partition) {
        return this.partitionLags.get(`${topic}:${partition}`);
    }
    /**
     * Get total lag across all partitions
     */
    getTotalLag() {
        let total = 0;
        for (const lag of this.partitionLags.values()) {
            total += lag.lag;
        }
        return total;
    }
    /**
     * Get all partition lags
     */
    getAllLags() {
        return Array.from(this.partitionLags.values());
    }
    /**
     * Get current backpressure state
     */
    getState() {
        return {
            active: this.isHighWaterMarkActive,
            queueSize: this.queue.length,
            maxQueueSize: this.config.maxQueueSize,
            spilledToDisk: this.spilledFiles.length > 0,
            spilledCount: this.spilledCount,
            spilledBytes: this.spilledBytes,
            pausedPartitions: Array.from(this.pausedPartitions),
            lastStateChange: this.lastStateChange,
        };
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueSize: this.queue.length,
            maxQueueSize: this.config.maxQueueSize,
            utilizationPercent: (this.queue.length / this.config.maxQueueSize) * 100,
            spilledCount: this.spilledCount,
            spilledBytes: this.spilledBytes,
            spilledFiles: this.spilledFiles.length,
            pausedPartitions: this.pausedPartitions.size,
            isHighWaterMarkActive: this.isHighWaterMarkActive,
            totalLag: this.getTotalLag(),
        };
    }
    /**
     * Clear all queued signals (for shutdown)
     */
    async clear() {
        this.queue = [];
        this.pausedPartitions.clear();
        this.isHighWaterMarkActive = false;
        // Clean up spill files
        for (const filepath of this.spilledFiles) {
            try {
                await fs.unlink(filepath);
            }
            catch {
                // Ignore cleanup errors
            }
        }
        this.spilledFiles = [];
        this.spilledCount = 0;
        this.spilledBytes = 0;
        this.logger.info('Backpressure handler cleared');
    }
    /**
     * Shutdown the handler
     */
    async shutdown() {
        await this.clear();
        this.removeAllListeners();
        this.logger.info('Backpressure handler shut down');
    }
}
exports.BackpressureHandler = BackpressureHandler;
/**
 * Create a backpressure handler instance
 */
function createBackpressureHandler(logger, config) {
    return new BackpressureHandler(logger, config);
}
