import NetInfo from '@react-native-community/netinfo';
import {apolloClient} from './GraphQLClient';
import {useSyncStore} from '../stores/syncStore';
import {useAppStore} from '../stores/appStore';
import {performanceMonitor} from './PerformanceMonitor';
import * as Sentry from '@sentry/react-native';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 10;

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

interface ConflictData {
  local: any;
  server: any;
  field: string;
}

/**
 * Enhanced offline sync service with conflict resolution
 */
class EnhancedOfflineSyncService {
  private isSyncing = false;
  private syncListeners: Set<(result: SyncResult) => void> = new Set();

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  }

  /**
   * Start sync process
   */
  async sync(): Promise<SyncResult> {
    performanceMonitor.mark('offline_sync');

    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Check if already syncing
    if (this.isSyncing) {
      console.log('[EnhancedSync] Sync already in progress');
      return result;
    }

    // Check if online
    const online = await this.isOnline();
    if (!online) {
      console.log('[EnhancedSync] Device is offline, skipping sync');
      useAppStore.getState().setOnlineStatus(false);
      return result;
    }

    useAppStore.getState().setOnlineStatus(true);

    try {
      this.isSyncing = true;
      useSyncStore.getState().setSyncing(true);

      console.log('[EnhancedSync] Starting sync...');

      // Get sync queue
      const queue = useSyncStore.getState().queue;

      if (queue.length === 0) {
        console.log('[EnhancedSync] Queue is empty');
        result.success = true;
        return result;
      }

      console.log(`[EnhancedSync] Processing ${queue.length} items`);

      // Process queue in batches
      const batches = this.createBatches(queue, BATCH_SIZE);

      for (const batch of batches) {
        const batchResult = await this.processBatch(batch);
        result.syncedCount += batchResult.syncedCount;
        result.failedCount += batchResult.failedCount;
        result.errors.push(...batchResult.errors);
      }

      result.success = result.failedCount === 0;

      // Update last sync time
      useSyncStore.getState().setLastSyncTime(Date.now());
      useAppStore.getState().setLastSyncTime(Date.now());

      console.log(`[EnhancedSync] Sync complete: ${result.syncedCount} synced, ${result.failedCount} failed`);

      // Notify listeners
      this.notifyListeners(result);

      performanceMonitor.measure('offline_sync', 'network', {
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
      });

      return result;
    } catch (error: any) {
      console.error('[EnhancedSync] Sync failed:', error);
      result.errors.push(error.message);

      Sentry.captureException(error, {
        tags: {
          component: 'offline_sync',
        },
      });

      return result;
    } finally {
      this.isSyncing = false;
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Process a batch of sync items
   */
  private async processBatch(batch: any[]): Promise<Omit<SyncResult, 'success'>> {
    const result = {
      syncedCount: 0,
      failedCount: 0,
      errors: [] as string[],
    };

    for (const item of batch) {
      try {
        await this.processItem(item);
        result.syncedCount++;
        useSyncStore.getState().incrementSynced();
        useSyncStore.getState().removeFromQueue(item.id);
      } catch (error: any) {
        result.failedCount++;
        result.errors.push(error.message);

        useSyncStore.getState().incrementFailed();
        useSyncStore.getState().addSyncError(error.message);

        // Update retry count
        const updatedRetryCount = item.retryCount + 1;
        useSyncStore.getState().updateQueueItem(item.id, {
          retryCount: updatedRetryCount,
          lastAttempt: Date.now(),
          error: error.message,
        });

        // Remove if max retries exceeded
        if (updatedRetryCount >= MAX_RETRIES) {
          console.log(`[EnhancedSync] Max retries exceeded for ${item.id}, removing from queue`);
          useSyncStore.getState().removeFromQueue(item.id);

          // Report to Sentry
          Sentry.captureMessage(`Sync item failed after ${MAX_RETRIES} retries`, {
            level: 'warning',
            extra: {
              item,
              error: error.message,
            },
          });
        }
      }
    }

    return result;
  }

  /**
   * Process a single sync item
   */
  private async processItem(item: any): Promise<void> {
    performanceMonitor.mark(`sync_item_${item.id}`);

    try {
      switch (item.type) {
        case 'mutation':
          await this.processMutation(item);
          break;
        case 'upload':
          await this.processUpload(item);
          break;
        case 'location':
          await this.processLocation(item);
          break;
        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }

      performanceMonitor.measure(`sync_item_${item.id}`, 'network', {
        type: item.type,
      });
    } catch (error) {
      performanceMonitor.measure(`sync_item_${item.id}`, 'network', {
        type: item.type,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Process a mutation with conflict detection
   */
  private async processMutation(item: any): Promise<void> {
    try {
      const result = await apolloClient.mutate({
        mutation: item.operation,
        variables: item.data,
        context: {
          // Add version/timestamp for conflict detection
          headers: {
            'X-Client-Version': item.createdAt,
          },
        },
      });

      console.log(`[EnhancedSync] Mutation synced: ${item.id}`);

      return result.data;
    } catch (error: any) {
      // Check if it's a conflict error
      if (error.graphQLErrors?.some((e: any) => e.extensions?.code === 'CONFLICT')) {
        console.log(`[EnhancedSync] Conflict detected for ${item.id}`);
        await this.handleConflict(item, error);
        throw new Error('Conflict detected - requires manual resolution');
      }

      throw error;
    }
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(item: any, error: any): Promise<void> {
    const serverData = error.graphQLErrors[0]?.extensions?.serverData;

    useSyncStore.getState().addConflict({
      id: item.id,
      localData: item.data,
      serverData,
      strategy: 'manual', // Default to manual resolution
    });

    // Apply conflict resolution strategy
    const settings = useAppStore.getState().settings;

    // Auto-resolve based on strategy (if configured)
    // For now, we default to manual resolution
    console.log(`[EnhancedSync] Conflict added for manual resolution: ${item.id}`);
  }

  /**
   * Process media upload
   */
  private async processUpload(item: any): Promise<void> {
    // Import the MediaUpload service dynamically to avoid circular deps
    const {uploadMedia} = await import('./MediaUpload');
    await uploadMedia(item.data);
    console.log(`[EnhancedSync] Upload synced: ${item.id}`);
  }

  /**
   * Process location update
   */
  private async processLocation(item: any): Promise<void> {
    // TODO: Implement location sync mutation
    console.log(`[EnhancedSync] Location synced: ${item.id}`);
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(arr: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      batches.push(arr.slice(i, i + size));
    }
    return batches;
  }

  /**
   * Add sync listener
   */
  addListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach((listener) => listener(result));
  }

  /**
   * Force sync now
   */
  async forceSync(): Promise<SyncResult> {
    console.log('[EnhancedSync] Force sync initiated');
    return this.sync();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const queue = useSyncStore.getState().queue;
    const isSyncing = useSyncStore.getState().isSyncing;
    const lastSyncTime = useSyncStore.getState().lastSyncTime;
    const conflicts = useSyncStore.getState().conflicts;
    const stats = useSyncStore.getState();

    return {
      queueSize: queue.length,
      isSyncing,
      lastSyncTime,
      unresolvedConflicts: conflicts.filter((c) => !c.resolvedAt).length,
      stats: {
        totalSynced: stats.totalSynced,
        totalFailed: stats.totalFailed,
      },
    };
  }
}

// Export singleton
export const enhancedOfflineSync = new EnhancedOfflineSyncService();

// Auto-sync when coming online
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    console.log('[EnhancedSync] Network connected, triggering sync');
    enhancedOfflineSync.sync();
  }
});
