"use strict";
/**
 * Offline sync utilities
 * Handles offline data synchronization and queue management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearOptimisticUpdates = exports.rollbackOptimisticUpdate = exports.removeOptimisticUpdate = exports.addOptimisticUpdate = exports.enableAutoSync = exports.onNetworkChange = exports.clearSyncQueue = exports.getSyncQueueStatus = exports.syncMutations = exports.queueMutation = exports.isOnline = void 0;
const storage_1 = require("../storage");
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 10,
};
// Check if online
const isOnline = () => {
    return typeof navigator !== 'undefined' && navigator.onLine;
};
exports.isOnline = isOnline;
// Queue mutation for offline sync
const queueMutation = async (operation, variables) => {
    const id = await (0, storage_1.addMutation)(operation, variables);
    console.log('[OfflineSync] Mutation queued:', id);
    // Try to sync immediately if online
    if ((0, exports.isOnline)()) {
        (0, exports.syncMutations)().catch((error) => {
            console.error('[OfflineSync] Immediate sync failed:', error);
        });
    }
    return id;
};
exports.queueMutation = queueMutation;
// Sync pending mutations
const syncMutations = async (executor, options = {}) => {
    if (!(0, exports.isOnline)()) {
        console.log('[OfflineSync] Device offline, skipping sync');
        return;
    }
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const mutations = await (0, storage_1.getPendingMutations)();
    if (mutations.length === 0) {
        console.log('[OfflineSync] No pending mutations');
        return;
    }
    console.log(`[OfflineSync] Syncing ${mutations.length} mutations`);
    await (0, storage_1.setSyncStatus)('mutations', 'syncing');
    let syncedCount = 0;
    const batch = mutations.slice(0, opts.batchSize);
    for (const mutation of batch) {
        try {
            // Execute mutation
            if (executor) {
                await executor(mutation.operation, mutation.variables);
            }
            // Delete from queue
            await (0, storage_1.deleteMutation)(mutation.id);
            syncedCount++;
            options.onProgress?.(syncedCount, batch.length);
            console.log(`[OfflineSync] Synced mutation ${mutation.id}`);
        }
        catch (error) {
            console.error(`[OfflineSync] Failed to sync mutation ${mutation.id}:`, error);
            // Update retry count
            await (0, storage_1.updateMutationRetry)(mutation.id, error.message);
            // Delete if max retries exceeded
            if (mutation.retryCount >= opts.maxRetries) {
                console.log(`[OfflineSync] Max retries exceeded for mutation ${mutation.id}, deleting`);
                await (0, storage_1.deleteMutation)(mutation.id);
            }
            options.onError?.(error);
        }
    }
    await (0, storage_1.setSyncStatus)('mutations', 'completed');
    console.log(`[OfflineSync] Sync completed: ${syncedCount}/${batch.length}`);
};
exports.syncMutations = syncMutations;
// Get sync queue status
const getSyncQueueStatus = async () => {
    const mutations = await (0, storage_1.getPendingMutations)();
    const syncStatus = await (0, storage_1.getSyncStatus)('mutations');
    return {
        pending: mutations.length,
        lastSync: syncStatus?.lastSync || null,
        status: syncStatus?.status || 'idle',
    };
};
exports.getSyncQueueStatus = getSyncQueueStatus;
// Clear sync queue
const clearSyncQueue = async () => {
    const mutations = await (0, storage_1.getPendingMutations)();
    for (const mutation of mutations) {
        await (0, storage_1.deleteMutation)(mutation.id);
    }
    console.log('[OfflineSync] Sync queue cleared');
};
exports.clearSyncQueue = clearSyncQueue;
// Network status listeners
const onNetworkChange = (callback) => {
    if (typeof window === 'undefined') {
        return () => { };
    }
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
exports.onNetworkChange = onNetworkChange;
// Auto-sync on network reconnection
const enableAutoSync = (executor, options = {}) => {
    const cleanup = (0, exports.onNetworkChange)((online) => {
        if (online) {
            console.log('[OfflineSync] Network restored, syncing...');
            (0, exports.syncMutations)(executor, options).catch((error) => {
                console.error('[OfflineSync] Auto-sync failed:', error);
            });
        }
    });
    return cleanup;
};
exports.enableAutoSync = enableAutoSync;
const optimisticUpdates = new Map();
const addOptimisticUpdate = (id, data, rollback) => {
    optimisticUpdates.set(id, { id, data, rollback });
};
exports.addOptimisticUpdate = addOptimisticUpdate;
const removeOptimisticUpdate = (id) => {
    optimisticUpdates.delete(id);
};
exports.removeOptimisticUpdate = removeOptimisticUpdate;
const rollbackOptimisticUpdate = (id) => {
    const update = optimisticUpdates.get(id);
    if (update) {
        update.rollback();
        optimisticUpdates.delete(id);
    }
};
exports.rollbackOptimisticUpdate = rollbackOptimisticUpdate;
const clearOptimisticUpdates = () => {
    optimisticUpdates.forEach((update) => update.rollback());
    optimisticUpdates.clear();
};
exports.clearOptimisticUpdates = clearOptimisticUpdates;
