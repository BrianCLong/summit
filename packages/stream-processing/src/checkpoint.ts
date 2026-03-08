import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { CheckpointConfig, StateBackend } from './types';
import { StateManager } from './state';

const logger = pino({ name: 'checkpoint-manager' });

/**
 * Checkpoint manager for fault tolerance
 */
export class CheckpointManager extends EventEmitter {
  private checkpointId: number = 0;
  private lastCheckpointTime: number = 0;
  private checkpointInProgress: boolean = false;
  private checkpointInterval: NodeJS.Timeout | null = null;
  private checkpointHistory: CheckpointMetadata[] = [];
  private maxCheckpointHistory: number = 10;

  constructor(
    private config: CheckpointConfig,
    private stateManager: StateManager
  ) {
    super();
  }

  /**
   * Start checkpointing
   */
  start(): void {
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
  stop(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
      logger.info('Checkpointing stopped');
    }
  }

  /**
   * Trigger checkpoint
   */
  async triggerCheckpoint(): Promise<void> {
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
      const metadata: CheckpointMetadata = {
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
    } catch (error) {
      logger.error({ error, checkpointId }, 'Checkpoint failed');

      const metadata: CheckpointMetadata = {
        id: checkpointId,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: false,
        error: String(error),
      };

      this.checkpointHistory.push(metadata);
      this.emit('checkpoint-failed', metadata);

      throw error;
    } finally {
      this.checkpointInProgress = false;
    }
  }

  /**
   * Perform checkpoint operation
   */
  private async performCheckpoint(checkpointId: number): Promise<void> {
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
  async restoreFromCheckpoint(checkpointId: number): Promise<void> {
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
    } catch (error) {
      logger.error({ error, checkpointId }, 'Restore failed');
      this.emit('restore-failed', checkpointId);
      throw error;
    }
  }

  /**
   * Get checkpoint history
   */
  getCheckpointHistory(): CheckpointMetadata[] {
    return [...this.checkpointHistory];
  }

  /**
   * Get last successful checkpoint
   */
  getLastSuccessfulCheckpoint(): CheckpointMetadata | null {
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
  private trimCheckpointHistory(): void {
    if (this.checkpointHistory.length > this.maxCheckpointHistory) {
      this.checkpointHistory = this.checkpointHistory.slice(
        -this.maxCheckpointHistory
      );
    }
  }

  /**
   * Get checkpoint statistics
   */
  getStatistics(): CheckpointStatistics {
    const successful = this.checkpointHistory.filter((c) => c.success).length;
    const failed = this.checkpointHistory.length - successful;

    const durations = this.checkpointHistory
      .filter((c) => c.success)
      .map((c) => c.duration);

    const avgDuration =
      durations.length > 0
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

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  id: number;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Checkpoint statistics
 */
export interface CheckpointStatistics {
  totalCheckpoints: number;
  successfulCheckpoints: number;
  failedCheckpoints: number;
  averageDuration: number;
  lastCheckpointId: number;
  isCheckpointInProgress: boolean;
}
