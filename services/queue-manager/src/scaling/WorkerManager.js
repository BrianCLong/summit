"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = void 0;
const bullmq_1 = require("bullmq");
const os_1 = __importDefault(require("os"));
const logger_js_1 = require("../utils/logger.js");
/**
 * Manages horizontal scaling of workers based on queue load and system resources
 */
class WorkerManager {
    workers = new Map();
    logger;
    connection;
    scalingConfig;
    scalingInterval;
    constructor(connection, config = {}) {
        this.connection = connection;
        this.logger = new logger_js_1.Logger('WorkerManager');
        this.scalingConfig = {
            minWorkers: config.minWorkers || 1,
            maxWorkers: config.maxWorkers || os_1.default.cpus().length,
            scaleUpThreshold: config.scaleUpThreshold || 100,
            scaleDownThreshold: config.scaleDownThreshold || 10,
            cpuThreshold: config.cpuThreshold || 0.8,
            memoryThreshold: config.memoryThreshold || 0.85,
        };
    }
    /**
     * Initialize worker pool for a queue
     */
    async initializeWorkerPool(queueName, processor, initialWorkers = this.scalingConfig.minWorkers) {
        const workers = [];
        for (let i = 0; i < initialWorkers; i++) {
            const worker = await this.createWorker(queueName, processor, i);
            workers.push(worker);
        }
        this.workers.set(queueName, workers);
        this.logger.info(`Initialized ${initialWorkers} workers for queue ${queueName}`);
    }
    /**
     * Start auto-scaling based on queue metrics and system resources
     */
    startAutoScaling(checkInterval = 30000) {
        this.scalingInterval = setInterval(() => {
            this.checkAndScale();
        }, checkInterval);
        this.logger.info(`Auto-scaling started with ${checkInterval}ms check interval`);
    }
    /**
     * Stop auto-scaling
     */
    stopAutoScaling() {
        if (this.scalingInterval) {
            clearInterval(this.scalingInterval);
            this.scalingInterval = undefined;
            this.logger.info('Auto-scaling stopped');
        }
    }
    /**
     * Manually scale workers for a queue
     */
    async scaleWorkers(queueName, targetCount, processor) {
        const currentWorkers = this.workers.get(queueName) || [];
        const currentCount = currentWorkers.length;
        if (targetCount === currentCount) {
            return;
        }
        if (targetCount > currentCount) {
            // Scale up
            const workersToAdd = targetCount - currentCount;
            for (let i = 0; i < workersToAdd; i++) {
                const worker = await this.createWorker(queueName, processor, currentCount + i);
                currentWorkers.push(worker);
            }
            this.logger.info(`Scaled up ${queueName}: ${currentCount} -> ${targetCount}`);
        }
        else {
            // Scale down
            const workersToRemove = currentCount - targetCount;
            for (let i = 0; i < workersToRemove; i++) {
                const worker = currentWorkers.pop();
                if (worker) {
                    await worker.close();
                }
            }
            this.logger.info(`Scaled down ${queueName}: ${currentCount} -> ${targetCount}`);
        }
        this.workers.set(queueName, currentWorkers);
    }
    /**
     * Get worker count for a queue
     */
    getWorkerCount(queueName) {
        return this.workers.get(queueName)?.length || 0;
    }
    /**
     * Get system resource usage
     */
    getSystemResources() {
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        return {
            cpuUsage: os_1.default.loadavg()[0] / os_1.default.cpus().length, // 1-minute load average normalized
            memoryUsage: usedMemory / totalMemory,
            availableMemory: freeMemory,
            totalMemory,
        };
    }
    /**
     * Gracefully shutdown all workers
     */
    async shutdown() {
        this.stopAutoScaling();
        const closePromises = [];
        for (const [queueName, workers] of this.workers.entries()) {
            this.logger.info(`Closing ${workers.length} workers for ${queueName}`);
            for (const worker of workers) {
                closePromises.push(worker.close());
            }
        }
        await Promise.all(closePromises);
        this.workers.clear();
        this.logger.info('All workers closed');
    }
    // Private methods
    async createWorker(queueName, processor, index) {
        const worker = new bullmq_1.Worker(queueName, processor, {
            connection: this.connection,
            concurrency: 10,
            lockDuration: 30000,
        });
        worker.on('error', (error) => {
            this.logger.error(`Worker ${index} error in ${queueName}`, error);
        });
        worker.on('failed', (job, error) => {
            this.logger.error(`Worker ${index} job ${job?.id} failed in ${queueName}`, error);
        });
        this.logger.info(`Created worker ${index} for queue ${queueName}`);
        return worker;
    }
    async checkAndScale() {
        const resources = this.getSystemResources();
        // Don't scale up if system resources are constrained
        const systemConstrained = resources.cpuUsage > this.scalingConfig.cpuThreshold ||
            resources.memoryUsage > this.scalingConfig.memoryThreshold;
        for (const [queueName, workers] of this.workers.entries()) {
            const currentCount = workers.length;
            // Get queue size (this would need to be implemented with actual queue metrics)
            const queueSize = await this.getQueueSize(queueName);
            // Determine scaling action
            if (queueSize > this.scalingConfig.scaleUpThreshold &&
                currentCount < this.scalingConfig.maxWorkers &&
                !systemConstrained) {
                // Scale up
                const newCount = Math.min(currentCount + 1, this.scalingConfig.maxWorkers);
                this.logger.info(`Auto-scaling up ${queueName}: ${currentCount} -> ${newCount} (queue size: ${queueSize})`);
                // Note: Would need processor reference to actually scale
                // await this.scaleWorkers(queueName, newCount, processor);
            }
            else if (queueSize < this.scalingConfig.scaleDownThreshold &&
                currentCount > this.scalingConfig.minWorkers) {
                // Scale down
                const newCount = Math.max(currentCount - 1, this.scalingConfig.minWorkers);
                this.logger.info(`Auto-scaling down ${queueName}: ${currentCount} -> ${newCount} (queue size: ${queueSize})`);
                // Note: Would need processor reference to actually scale
                // await this.scaleWorkers(queueName, newCount, processor);
            }
        }
        this.logger.debug('Auto-scaling check complete', {
            cpuUsage: `${(resources.cpuUsage * 100).toFixed(2)}%`,
            memoryUsage: `${(resources.memoryUsage * 100).toFixed(2)}%`,
            systemConstrained,
        });
    }
    async getQueueSize(queueName) {
        // This is a placeholder - in practice, you'd query the actual queue
        // For now, return a random value for demonstration
        return Math.floor(Math.random() * 200);
    }
}
exports.WorkerManager = WorkerManager;
