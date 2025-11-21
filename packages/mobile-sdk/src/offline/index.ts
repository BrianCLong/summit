/**
 * Offline sync utilities
 * Handles offline data synchronization and queue management
 */

import {
  addMutation,
  getPendingMutations,
  deleteMutation,
  updateMutationRetry,
  setSyncStatus,
  getSyncStatus,
} from '../storage';

export interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  onProgress?: (synced: number, total: number) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<SyncOptions, 'onProgress' | 'onError'>> = {
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 10,
};

// Check if online
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// Queue mutation for offline sync
export const queueMutation = async (operation: string, variables: any): Promise<number> => {
  const id = await addMutation(operation, variables);
  console.log('[OfflineSync] Mutation queued:', id);

  // Try to sync immediately if online
  if (isOnline()) {
    syncMutations().catch((error) => {
      console.error('[OfflineSync] Immediate sync failed:', error);
    });
  }

  return id;
};

// Sync pending mutations
export const syncMutations = async (
  executor?: (operation: string, variables: any) => Promise<any>,
  options: SyncOptions = {}
): Promise<void> => {
  if (!isOnline()) {
    console.log('[OfflineSync] Device offline, skipping sync');
    return;
  }

  const opts = {...DEFAULT_OPTIONS, ...options};
  const mutations = await getPendingMutations();

  if (mutations.length === 0) {
    console.log('[OfflineSync] No pending mutations');
    return;
  }

  console.log(`[OfflineSync] Syncing ${mutations.length} mutations`);
  await setSyncStatus('mutations', 'syncing');

  let syncedCount = 0;
  const batch = mutations.slice(0, opts.batchSize);

  for (const mutation of batch) {
    try {
      // Execute mutation
      if (executor) {
        await executor(mutation.operation, mutation.variables);
      }

      // Delete from queue
      await deleteMutation(mutation.id!);
      syncedCount++;

      options.onProgress?.(syncedCount, batch.length);
      console.log(`[OfflineSync] Synced mutation ${mutation.id}`);
    } catch (error: any) {
      console.error(`[OfflineSync] Failed to sync mutation ${mutation.id}:`, error);

      // Update retry count
      await updateMutationRetry(mutation.id!, error.message);

      // Delete if max retries exceeded
      if (mutation.retryCount >= opts.maxRetries) {
        console.log(
          `[OfflineSync] Max retries exceeded for mutation ${mutation.id}, deleting`
        );
        await deleteMutation(mutation.id!);
      }

      options.onError?.(error);
    }
  }

  await setSyncStatus('mutations', 'completed');
  console.log(`[OfflineSync] Sync completed: ${syncedCount}/${batch.length}`);
};

// Get sync queue status
export const getSyncQueueStatus = async (): Promise<{
  pending: number;
  lastSync: number | null;
  status: string;
}> => {
  const mutations = await getPendingMutations();
  const syncStatus = await getSyncStatus('mutations');

  return {
    pending: mutations.length,
    lastSync: syncStatus?.lastSync || null,
    status: syncStatus?.status || 'idle',
  };
};

// Clear sync queue
export const clearSyncQueue = async (): Promise<void> => {
  const mutations = await getPendingMutations();

  for (const mutation of mutations) {
    await deleteMutation(mutation.id!);
  }

  console.log('[OfflineSync] Sync queue cleared');
};

// Network status listeners
export const onNetworkChange = (callback: (online: boolean) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Auto-sync on network reconnection
export const enableAutoSync = (
  executor: (operation: string, variables: any) => Promise<any>,
  options: SyncOptions = {}
): (() => void) => {
  const cleanup = onNetworkChange((online) => {
    if (online) {
      console.log('[OfflineSync] Network restored, syncing...');
      syncMutations(executor, options).catch((error) => {
        console.error('[OfflineSync] Auto-sync failed:', error);
      });
    }
  });

  return cleanup;
};

// Optimistic updates
export interface OptimisticUpdate<T> {
  id: string;
  data: T;
  rollback: () => void;
}

const optimisticUpdates = new Map<string, OptimisticUpdate<any>>();

export const addOptimisticUpdate = <T>(
  id: string,
  data: T,
  rollback: () => void
): void => {
  optimisticUpdates.set(id, {id, data, rollback});
};

export const removeOptimisticUpdate = (id: string): void => {
  optimisticUpdates.delete(id);
};

export const rollbackOptimisticUpdate = (id: string): void => {
  const update = optimisticUpdates.get(id);
  if (update) {
    update.rollback();
    optimisticUpdates.delete(id);
  }
};

export const clearOptimisticUpdates = (): void => {
  optimisticUpdates.forEach((update) => update.rollback());
  optimisticUpdates.clear();
};
