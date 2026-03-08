"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckpointManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'checkpoint-manager' });
/**
 * Checkpoint manager for fault tolerance
 */
class CheckpointManager extends eventemitter3_1.EventEmitter {
    config;
    stateManager;
    checkpointId = 0;
    lastCheckpointTime = 0;
    checkpointInProgress = false;
    checkpointInterval = null;
    checkpointHistory = [];
    maxCheckpointHistory = 10;
    constructor(config, stateManager) {
        super();
        this.config = config;
        this.stateManager = stateManager;
    }
    /**
     * Start checkpointing
     */
    start() {
        if (this.checkpointInterval) {
            logger.warn('Checkpointing already started');
            return;
        }
        if (!this.config.enabled) {
            logger.info('Checkpointing disabled');
            return;
        }
        this.checkpointInterval = setInterval(() => {
            this.triggerCheckpoint();
        }, this.config.interval);
        logger.info({ interval: this.config.interval }, 'Checkpointing started');
    }
    /**
     * Stop checkpointing
     */
    stop() {
        if (this.checkpointInterval) {
            clearInterval(this.checkpointInterval);
            this.checkpointInterval = null;
            logger.info('Checkpointing stopped');
        }
    }
    /**
     * Trigger checkpoint
     */
    async triggerCheckpoint() {
        // Check minimum pause between checkpoints
        const now = Date.now();
        if (now - this.lastCheckpointTime < this.config.minPauseBetweenCheckpoints) {
            logger.debug('Skipping checkpoint due to min pause');
            return;
        }
        // Check concurrent checkpoints
        if (this.checkpointInProgress) {
            logger.warn('Checkpoint already in progress');
            return;
        }
        this.checkpointInProgress = true;
        const checkpointId = ++this.checkpointId;
        const startTime = Date.now();
        logger.info({ checkpointId }, 'Checkpoint started');
        this.emit('checkpoint-start', checkpointId);
        try {
            // Perform checkpoint (this is where state would be snapshotted)
            await this.performCheckpoint(checkpointId);
            const duration = Date.now() - startTime;
            // Check timeout
            if (duration > this.config.timeout) {
                throw new Error(`Checkpoint timeout: ${duration}ms > ${this.config.timeout}ms`);
            }
            // Record checkpoint metadata
            const metadata = {
                id: checkpointId,
                timestamp: startTime,
                duration,
                success: true,
            };
            this.checkpointHistory.push(metadata);
            this.trimCheckpointHistory();
            this.lastCheckpointTime = Date.now();
            this.emit('checkpoint-complete', metadata);
            logger.info({ checkpointId, duration }, 'Checkpoint completed');
        }
        catch (error) {
            logger.error({ error, checkpointId }, 'Checkpoint failed');
            const metadata = {
                id: checkpointId,
                timestamp: startTime,
                duration: Date.now() - startTime,
                success: false,
                error: String(error),
            };
            this.checkpointHistory.push(metadata);
            this.emit('checkpoint-failed', metadata);
            throw error;
        }
        finally {
            this.checkpointInProgress = false;
        }
    }
    /**
     * Perform checkpoint operation
     */
    async performCheckpoint(checkpointId) {
        // In a real implementation, this would:
        // 1. Create barrier in the stream
        // 2. Snapshot operator state
        // 3. Persist state to checkpoint backend
        // 4. Acknowledge checkpoint
        // For now, we just emit an event
        this.emit('checkpoint', checkpointId);
        // Simulate checkpoint work
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    /**
     * Restore from checkpoint
     */
    async restoreFromCheckpoint(checkpointId) {
        logger.info({ checkpointId }, 'Restoring from checkpoint');
        try {
            // In a real implementation, this would:
            // 1. Load checkpoint metadata
            // 2. Restore operator state
            // 3. Reposition stream offsets
            this.emit('restore-start', checkpointId);
            // Simulate restore work
            await new Promise((resolve) => setTimeout(resolve, 100));
            this.emit('restore-complete', checkpointId);
            logger.info({ checkpointId }, 'Restore completed');
        }
        catch (error) {
            logger.error({ error, checkpointId }, 'Restore failed');
            this.emit('restore-failed', checkpointId);
            throw error;
        }
    }
    /**
     * Get checkpoint history
     */
    getCheckpointHistory() {
        return [...this.checkpointHistory];
    }
    /**
     * Get last successful checkpoint
     */
    getLastSuccessfulCheckpoint() {
        for (let i = this.checkpointHistory.length - 1; i >= 0; i--) {
            if (this.checkpointHistory[i].success) {
                return this.checkpointHistory[i];
            }
        }
        return null;
    }
    /**
     * Trim checkpoint history
     */
    trimCheckpointHistory() {
        if (this.checkpointHistory.length > this.maxCheckpointHistory) {
            this.checkpointHistory = this.checkpointHistory.slice(-this.maxCheckpointHistory);
        }
    }
    /**
     * Get checkpoint statistics
     */
    getStatistics() {
        const successful = this.checkpointHistory.filter((c) => c.success).length;
        const failed = this.checkpointHistory.length - successful;
        const durations = this.checkpointHistory
            .filter((c) => c.success)
            .map((c) => c.duration);
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;
        return {
            totalCheckpoints: this.checkpointHistory.length,
            successfulCheckpoints: successful,
            failedCheckpoints: failed,
            averageDuration: avgDuration,
            lastCheckpointId: this.checkpointId,
            isCheckpointInProgress: this.checkpointInProgress,
        };
    }
}
exports.CheckpointManager = CheckpointManager;
