/**
 * Base class for all OSINT collectors
 */

import { EventEmitter } from 'events';
import type { CollectionTask, CollectionResult, CollectorConfig } from '../types/index.js';

export abstract class CollectorBase extends EventEmitter {
  protected config: CollectorConfig;
  protected isRunning: boolean = false;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the collector
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error(`Collector ${this.config.name} is not enabled`);
    }
    await this.onInitialize();
  }

  /**
   * Collect data based on task
   */
  async collect(task: CollectionTask): Promise<CollectionResult> {
    if (!this.config.enabled) {
      throw new Error(`Collector ${this.config.name} is not enabled`);
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.emit('collection:start', { taskId: task.id, collector: this.config.name });

      const data = await this.performCollection(task);
      const duration = Date.now() - startTime;

      const result: CollectionResult = {
        taskId: task.id,
        source: task.source,
        collectedAt: new Date(),
        data,
        metadata: {
          duration,
          recordCount: this.countRecords(data)
        }
      };

      this.emit('collection:complete', result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emit('collection:error', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Shutdown the collector
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.onShutdown();
  }

  /**
   * Get collector status
   */
  getStatus(): { name: string; enabled: boolean; running: boolean } {
    return {
      name: this.config.name,
      enabled: this.config.enabled,
      running: this.isRunning
    };
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract performCollection(task: CollectionTask): Promise<unknown>;
  protected abstract onShutdown(): Promise<void>;
  protected abstract countRecords(data: unknown): number;
}
