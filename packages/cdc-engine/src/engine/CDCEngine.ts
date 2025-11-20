/**
 * Change Data Capture Engine
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  CDCConfig,
  CDCMode,
  ChangeRecord,
  ChangeType,
  IConnector,
  ICDCConnector,
} from '@intelgraph/data-integration';
import { CDCStrategy } from './ICDCStrategy';
import { StateManager } from '../state/StateManager';

/**
 * CDC Engine for capturing database changes
 */
export class CDCEngine extends EventEmitter {
  private config: CDCConfig;
  private sourceConnector!: IConnector;
  private strategy!: CDCStrategy;
  private stateManager: StateManager;
  private active: boolean = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(config: CDCConfig) {
    super();
    this.config = config;
    this.stateManager = new StateManager();
  }

  /**
   * Set source connector
   */
  setSourceConnector(connector: IConnector): void {
    this.sourceConnector = connector;
  }

  /**
   * Set CDC strategy
   */
  setStrategy(strategy: CDCStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Start CDC
   */
  async start(): Promise<void> {
    if (this.active) {
      throw new Error('CDC already active');
    }

    if (!this.sourceConnector) {
      throw new Error('Source connector not configured');
    }

    if (!this.strategy) {
      // Auto-select strategy based on mode
      this.strategy = this.createStrategy(this.config.mode);
    }

    this.active = true;
    this.emit('cdc:started');

    // Load last watermark
    const watermark = await this.stateManager.getWatermark();
    if (watermark) {
      this.config.watermark = watermark;
    }

    // Start capturing changes based on mode
    if (this.config.mode === CDCMode.LOG_BASED) {
      await this.startLogBasedCDC();
    } else if (this.config.mode === CDCMode.TIMESTAMP_BASED) {
      await this.startTimestampBasedCDC();
    } else if (this.config.mode === CDCMode.DELTA_DETECTION) {
      await this.startDeltaDetectionCDC();
    } else if (this.config.mode === CDCMode.QUERY_BASED) {
      await this.startQueryBasedCDC();
    } else {
      throw new Error(`Unsupported CDC mode: ${this.config.mode}`);
    }
  }

  /**
   * Stop CDC
   */
  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.active = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Save final watermark
    if (this.config.watermark) {
      await this.stateManager.saveWatermark(this.config.watermark);
    }

    this.emit('cdc:stopped');
  }

  /**
   * Pause CDC
   */
  async pause(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.active = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    this.emit('cdc:paused');
  }

  /**
   * Resume CDC
   */
  async resume(): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    this.emit('cdc:resumed');

    // Restart capturing
    await this.start();
  }

  /**
   * Get changes as async iterator
   */
  async *getChanges(): AsyncIterableIterator<ChangeRecord> {
    while (this.active) {
      const changes = await this.strategy.captureChanges(
        this.sourceConnector,
        this.config
      );

      for (const change of changes) {
        yield change;

        // Update watermark
        if (change.timestamp) {
          this.config.watermark = change.timestamp;
        }
      }

      // Wait before next poll
      if (this.config.pollInterval) {
        await new Promise(resolve => setTimeout(resolve, this.config.pollInterval));
      } else {
        break; // No polling, exit after one iteration
      }
    }
  }

  // ============================================================================
  // Private methods for different CDC modes
  // ============================================================================

  /**
   * Start log-based CDC
   */
  private async startLogBasedCDC(): Promise<void> {
    if (!this.isCDCConnector(this.sourceConnector)) {
      throw new Error('Source connector does not support CDC');
    }

    const cdcOptions = {
      tables: this.config.tables,
      fromPosition: this.config.watermark as string,
      includeOldValues: this.config.captureOldValues,
      pollInterval: this.config.pollInterval,
    };

    for await (const change of this.sourceConnector.startCDC(cdcOptions)) {
      if (!this.active) break;

      this.emit('change', change);

      // Update watermark
      if (change.position) {
        this.config.watermark = change.position;
        await this.stateManager.saveWatermark(change.position);
      }
    }
  }

  /**
   * Start timestamp-based CDC
   */
  private async startTimestampBasedCDC(): Promise<void> {
    const pollInterval = this.config.pollInterval || 60000; // Default 1 minute

    const poll = async () => {
      if (!this.active) return;

      try {
        const changes = await this.strategy.captureChanges(
          this.sourceConnector,
          this.config
        );

        for (const change of changes) {
          this.emit('change', change);
        }

        // Update watermark to current time
        this.config.watermark = new Date();
        await this.stateManager.saveWatermark(this.config.watermark);
      } catch (error) {
        this.emit('error', error);
      }

      // Schedule next poll
      if (this.active) {
        this.pollTimer = setTimeout(poll, pollInterval);
      }
    };

    await poll();
  }

  /**
   * Start delta detection CDC
   */
  private async startDeltaDetectionCDC(): Promise<void> {
    // Similar to timestamp-based but compares snapshots
    const pollInterval = this.config.pollInterval || 300000; // Default 5 minutes

    const poll = async () => {
      if (!this.active) return;

      try {
        const changes = await this.strategy.captureChanges(
          this.sourceConnector,
          this.config
        );

        for (const change of changes) {
          this.emit('change', change);
        }

        // Save snapshot state
        const snapshotId = uuidv4();
        await this.stateManager.saveSnapshot(snapshotId, {
          timestamp: new Date(),
          recordCount: changes.length,
        });
      } catch (error) {
        this.emit('error', error);
      }

      // Schedule next poll
      if (this.active) {
        this.pollTimer = setTimeout(poll, pollInterval);
      }
    };

    await poll();
  }

  /**
   * Start query-based CDC
   */
  private async startQueryBasedCDC(): Promise<void> {
    // Similar to timestamp-based but uses custom queries
    await this.startTimestampBasedCDC();
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  /**
   * Check if connector supports CDC
   */
  private isCDCConnector(connector: IConnector): connector is ICDCConnector {
    return 'startCDC' in connector && typeof connector.startCDC === 'function';
  }

  /**
   * Create strategy based on mode
   */
  private createStrategy(mode: CDCMode): CDCStrategy {
    // This would be implemented to return the appropriate strategy
    // For now, return a placeholder
    return {
      captureChanges: async () => [],
    };
  }
}
