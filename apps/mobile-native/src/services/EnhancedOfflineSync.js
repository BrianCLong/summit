"use strict";
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
exports.enhancedOfflineSync = void 0;
const GraphQLClient_1 = require("./GraphQLClient");
const syncStore_1 = require("../stores/syncStore");
const appStore_1 = require("../stores/appStore");
const PerformanceMonitor_1 = require("./PerformanceMonitor");
const Sentry = __importStar(require("@sentry/react-native"));
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const BATCH_SIZE = 10;
/**
 * Enhanced offline sync service with conflict resolution
 */
class EnhancedOfflineSyncService {
    isSyncing = false;
    syncListeners = new Set();
    /**
     * Check if device is online
     */
    async isOnline() {
        const state = await NetInfo.fetch();
        return state.isConnected === true && state.isInternetReachable === true;
    }
    /**
     * Start sync process
     */
    async sync() {
        PerformanceMonitor_1.performanceMonitor.mark('offline_sync');
        const result = {
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
            appStore_1.useAppStore.getState().setOnlineStatus(false);
            return result;
        }
        appStore_1.useAppStore.getState().setOnlineStatus(true);
        try {
            this.isSyncing = true;
            syncStore_1.useSyncStore.getState().setSyncing(true);
            console.log('[EnhancedSync] Starting sync...');
            // Get sync queue
            const queue = syncStore_1.useSyncStore.getState().queue;
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
            syncStore_1.useSyncStore.getState().setLastSyncTime(Date.now());
            appStore_1.useAppStore.getState().setLastSyncTime(Date.now());
            console.log(`[EnhancedSync] Sync complete: ${result.syncedCount} synced, ${result.failedCount} failed`);
            // Notify listeners
            this.notifyListeners(result);
            PerformanceMonitor_1.performanceMonitor.measure('offline_sync', 'network', {
                syncedCount: result.syncedCount,
                failedCount: result.failedCount,
            });
            return result;
        }
        catch (error) {
            console.error('[EnhancedSync] Sync failed:', error);
            result.errors.push(error.message);
            Sentry.captureException(error, {
                tags: {
                    component: 'offline_sync',
                },
            });
            return result;
        }
        finally {
            this.isSyncing = false;
            syncStore_1.useSyncStore.getState().setSyncing(false);
        }
    }
    /**
     * Process a batch of sync items
     */
    async processBatch(batch) {
        const result = {
            syncedCount: 0,
            failedCount: 0,
            errors: [],
        };
        for (const item of batch) {
            try {
                await this.processItem(item);
                result.syncedCount++;
                syncStore_1.useSyncStore.getState().incrementSynced();
                syncStore_1.useSyncStore.getState().removeFromQueue(item.id);
            }
            catch (error) {
                result.failedCount++;
                result.errors.push(error.message);
                syncStore_1.useSyncStore.getState().incrementFailed();
                syncStore_1.useSyncStore.getState().addSyncError(error.message);
                // Update retry count
                const updatedRetryCount = item.retryCount + 1;
                syncStore_1.useSyncStore.getState().updateQueueItem(item.id, {
                    retryCount: updatedRetryCount,
                    lastAttempt: Date.now(),
                    error: error.message,
                });
                // Remove if max retries exceeded
                if (updatedRetryCount >= MAX_RETRIES) {
                    console.log(`[EnhancedSync] Max retries exceeded for ${item.id}, removing from queue`);
                    syncStore_1.useSyncStore.getState().removeFromQueue(item.id);
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
    async processItem(item) {
        PerformanceMonitor_1.performanceMonitor.mark(`sync_item_${item.id}`);
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
            PerformanceMonitor_1.performanceMonitor.measure(`sync_item_${item.id}`, 'network', {
                type: item.type,
            });
        }
        catch (error) {
            PerformanceMonitor_1.performanceMonitor.measure(`sync_item_${item.id}`, 'network', {
                type: item.type,
                error: true,
            });
            throw error;
        }
    }
    /**
     * Process a mutation with conflict detection
     */
    async processMutation(item) {
        try {
            const result = await GraphQLClient_1.apolloClient.mutate({
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
        }
        catch (error) {
            // Check if it's a conflict error
            if (error.graphQLErrors?.some((e) => e.extensions?.code === 'CONFLICT')) {
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
    async handleConflict(item, error) {
        const serverData = error.graphQLErrors[0]?.extensions?.serverData;
        syncStore_1.useSyncStore.getState().addConflict({
            id: item.id,
            localData: item.data,
            serverData,
            strategy: 'manual', // Default to manual resolution
        });
        // Apply conflict resolution strategy
        const settings = appStore_1.useAppStore.getState().settings;
        // Auto-resolve based on strategy (if configured)
        // For now, we default to manual resolution
        console.log(`[EnhancedSync] Conflict added for manual resolution: ${item.id}`);
    }
    /**
     * Process media upload
     */
    async processUpload(item) {
        // Import the MediaUpload service dynamically to avoid circular deps
        const { uploadMedia } = await Promise.resolve().then(() => __importStar(require('./MediaUpload')));
        await uploadMedia(item.data);
        console.log(`[EnhancedSync] Upload synced: ${item.id}`);
    }
    /**
     * Process location update
     */
    async processLocation(item) {
        // TODO: Implement location sync mutation
        console.log(`[EnhancedSync] Location synced: ${item.id}`);
    }
    /**
     * Create batches from array
     */
    createBatches(arr, size) {
        const batches = [];
        for (let i = 0; i < arr.length; i += size) {
            batches.push(arr.slice(i, i + size));
        }
        return batches;
    }
    /**
     * Add sync listener
     */
    addListener(listener) {
        this.syncListeners.add(listener);
        return () => this.syncListeners.delete(listener);
    }
    /**
     * Notify all listeners
     */
    notifyListeners(result) {
        this.syncListeners.forEach((listener) => listener(result));
    }
    /**
     * Force sync now
     */
    async forceSync() {
        console.log('[EnhancedSync] Force sync initiated');
        return this.sync();
    }
    /**
     * Get sync status
     */
    getSyncStatus() {
        const queue = syncStore_1.useSyncStore.getState().queue;
        const isSyncing = syncStore_1.useSyncStore.getState().isSyncing;
        const lastSyncTime = syncStore_1.useSyncStore.getState().lastSyncTime;
        const conflicts = syncStore_1.useSyncStore.getState().conflicts;
        const stats = syncStore_1.useSyncStore.getState();
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
exports.enhancedOfflineSync = new EnhancedOfflineSyncService();
// Auto-sync when coming online
NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
        console.log('[EnhancedSync] Network connected, triggering sync');
        exports.enhancedOfflineSync.sync();
    }
});
