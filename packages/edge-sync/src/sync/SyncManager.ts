import EventEmitter from 'eventemitter3';
import { pino, type Logger } from 'pino';
import type { SyncQueueItem } from '@intelgraph/edge-computing';

export interface SyncConfig {
  endpoint: string;
  syncInterval: number; // seconds
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number; // ms
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  bandwidthLimit?: number; // bytes per second
  offlineQueue: {
    enabled: boolean;
    maxSize: number; // number of items
    persistToDisk: boolean;
  };
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'delete';
  resourceType: 'model' | 'data' | 'config' | 'logs';
  resourceId: string;
  localPath?: string;
  remotePath?: string;
  size: number;
  checksum?: string;
  priority: number;
  timestamp: Date;
}

export interface SyncStatus {
  totalOperations: number;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
  bytesTransferred: number;
  lastSyncTime?: Date;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Sync Manager
 * Manages edge-to-cloud synchronization with offline support
 */
export class SyncManager extends EventEmitter {
  private logger: Logger;
  private config: SyncConfig;
  private queue: SyncOperation[] = [];
  private activeOperations: Map<string, SyncOperation> = new Map();
  private completedOperations: SyncOperation[] = [];
  private failedOperations: Map<string, { operation: SyncOperation; error: Error }> = new Map();
  private isOnline = true;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private bytesTransferred = 0;
  private lastSyncTime?: Date;

  constructor(config: SyncConfig, logger?: Logger) {
    super();
    this.config = config;
    this.logger = logger || pino({ name: 'SyncManager' });
  }

  /**
   * Start sync manager
   */
  async start(): Promise<void> {
    if (this.syncInterval) {
      this.logger.warn('Sync manager already started');
      return;
    }

    this.logger.info({ interval: this.config.syncInterval }, 'Starting sync manager');

    // Initial sync
    await this.sync();

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.config.syncInterval * 1000);

    this.emit('started');
  }

  /**
   * Stop sync manager
   */
  async stop(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Wait for active operations to complete
    while (this.activeOperations.size > 0) {
      await this.sleep(100);
    }

    this.logger.info('Sync manager stopped');
    this.emit('stopped');
  }

  /**
   * Add operation to sync queue
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<string> {
    const op: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date()
    };

    // Check queue size limit
    if (
      this.config.offlineQueue.enabled &&
      this.queue.length >= this.config.offlineQueue.maxSize
    ) {
      throw new Error('Sync queue is full');
    }

    this.queue.push(op);

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);

    this.logger.debug({ operationId: op.id, type: op.type }, 'Operation enqueued');
    this.emit('operation-enqueued', op);

    // Trigger sync if online
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }

    return op.id;
  }

  /**
   * Perform synchronization
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress');
      return;
    }

    if (!this.isOnline) {
      this.logger.debug('Offline, skipping sync');
      return;
    }

    if (this.queue.length === 0) {
      this.logger.debug('No operations to sync');
      return;
    }

    this.isSyncing = true;
    this.emit('sync-started');

    try {
      while (this.queue.length > 0 && this.activeOperations.size < this.config.maxConcurrent) {
        const operation = this.queue.shift()!;
        this.processOperation(operation);
      }

      // Wait for all active operations to complete
      while (this.activeOperations.size > 0) {
        await this.sleep(100);
      }

      this.lastSyncTime = new Date();
      this.logger.info('Sync completed');
      this.emit('sync-completed', this.getStatus());
    } catch (error) {
      this.logger.error({ error }, 'Sync failed');
      this.emit('sync-failed', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    this.activeOperations.set(operation.id, operation);

    try {
      this.logger.debug(
        { operationId: operation.id, type: operation.type },
        'Processing operation'
      );

      switch (operation.type) {
        case 'upload':
          await this.performUpload(operation);
          break;
        case 'download':
          await this.performDownload(operation);
          break;
        case 'delete':
          await this.performDelete(operation);
          break;
      }

      this.completedOperations.push(operation);
      this.bytesTransferred += operation.size;

      this.logger.info({ operationId: operation.id }, 'Operation completed');
      this.emit('operation-completed', operation);
    } catch (error) {
      this.logger.error({ error, operationId: operation.id }, 'Operation failed');

      const retryCount = this.getRetryCount(operation.id);

      if (retryCount < this.config.maxRetries) {
        // Retry operation
        await this.sleep(this.config.retryDelay * Math.pow(2, retryCount));
        this.queue.unshift(operation);
        this.logger.info({ operationId: operation.id, retry: retryCount + 1 }, 'Retrying operation');
      } else {
        // Max retries reached
        this.failedOperations.set(operation.id, { operation, error: error as Error });
        this.emit('operation-failed', { operation, error });
      }
    } finally {
      this.activeOperations.delete(operation.id);
    }
  }

  /**
   * Perform upload operation
   */
  private async performUpload(operation: SyncOperation): Promise<void> {
    // Simulate upload
    // In real implementation, this would:
    // 1. Read local file
    // 2. Compress if enabled
    // 3. Encrypt if enabled
    // 4. Upload to cloud endpoint
    // 5. Verify checksum

    const uploadTime = this.simulateTransfer(operation.size);
    await this.sleep(uploadTime);

    this.logger.debug({ operationId: operation.id, size: operation.size }, 'Upload completed');
  }

  /**
   * Perform download operation
   */
  private async performDownload(operation: SyncOperation): Promise<void> {
    // Simulate download
    // In real implementation, this would:
    // 1. Download from cloud endpoint
    // 2. Verify checksum
    // 3. Decrypt if encrypted
    // 4. Decompress if compressed
    // 5. Write to local file

    const downloadTime = this.simulateTransfer(operation.size);
    await this.sleep(downloadTime);

    this.logger.debug({ operationId: operation.id, size: operation.size }, 'Download completed');
  }

  /**
   * Perform delete operation
   */
  private async performDelete(operation: SyncOperation): Promise<void> {
    // Simulate delete
    await this.sleep(100);

    this.logger.debug({ operationId: operation.id }, 'Delete completed');
  }

  /**
   * Simulate transfer time based on bandwidth limit
   */
  private simulateTransfer(size: number): number {
    if (this.config.bandwidthLimit) {
      return (size / this.config.bandwidthLimit) * 1000;
    }
    // Assume 10 MB/s if no limit
    return (size / (10 * 1024 * 1024)) * 1000;
  }

  /**
   * Get retry count for an operation
   */
  private getRetryCount(operationId: string): number {
    return this.completedOperations.filter(op => op.id === operationId).length;
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    if (this.isOnline === isOnline) {
      return;
    }

    this.isOnline = isOnline;
    this.logger.info({ isOnline }, 'Online status changed');

    this.emit('online-status-changed', isOnline);

    // Trigger sync when coming back online
    if (isOnline && this.queue.length > 0) {
      this.sync();
    }
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return {
      totalOperations: this.queue.length + this.activeOperations.size + this.completedOperations.length,
      pendingOperations: this.queue.length,
      completedOperations: this.completedOperations.length,
      failedOperations: this.failedOperations.size,
      bytesTransferred: this.bytesTransferred,
      lastSyncTime: this.lastSyncTime,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing
    };
  }

  /**
   * Get queue items
   */
  getQueue(): SyncOperation[] {
    return [...this.queue];
  }

  /**
   * Clear failed operations
   */
  clearFailedOperations(): void {
    this.failedOperations.clear();
    this.logger.info('Failed operations cleared');
  }

  /**
   * Retry failed operations
   */
  retryFailedOperations(): void {
    for (const [id, { operation }] of this.failedOperations) {
      this.queue.push(operation);
      this.failedOperations.delete(id);
    }

    this.queue.sort((a, b) => b.priority - a.priority);

    this.logger.info('Failed operations re-queued');

    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): boolean {
    const index = this.queue.findIndex(op => op.id === operationId);

    if (index !== -1) {
      const operation = this.queue.splice(index, 1)[0];
      this.logger.info({ operationId }, 'Operation cancelled');
      this.emit('operation-cancelled', operation);
      return true;
    }

    return false;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.logger.info('Queue cleared');
    this.emit('queue-cleared');
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
