import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import BackgroundFetch from 'react-native-background-fetch';

import { SYNC_CONFIG, FEATURES } from '@/config';
import { getApolloClient } from './GraphQLClient';
import {
  getPendingMutations,
  removePendingMutation,
  updateMutationRetry,
  shouldRetryMutation,
  isOnline,
  type OfflineMutation,
} from './OfflineQueueService';
import { useAppStore } from '@/stores/appStore';

const storage = new MMKV({ id: 'sync-service' });

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

let syncInProgress = false;
let networkUnsubscribe: (() => void) | null = null;

// Initialize sync service
export const initializeSyncService = async (): Promise<void> => {
  // Listen for network changes
  networkUnsubscribe = NetInfo.addEventListener(handleNetworkChange);

  // Setup background fetch for iOS/Android
  if (FEATURES.enableBackgroundSync) {
    await setupBackgroundSync();
  }

  // Perform initial sync if online
  const online = await isOnline();
  if (online) {
    await performSync();
  }

  console.log('[SyncService] Initialized');
};

// Cleanup sync service
export const cleanupSyncService = (): void => {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
};

// Handle network state changes
const handleNetworkChange = async (state: NetInfoState): Promise<void> => {
  console.log('[SyncService] Network state changed:', state.isConnected);

  useAppStore.getState().setOfflineMode(!state.isConnected);

  if (state.isConnected && state.isInternetReachable) {
    // Device came online, trigger sync
    await performSync();
  }
};

// Setup background sync
const setupBackgroundSync = async (): Promise<void> => {
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // minutes
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async (taskId) => {
        console.log('[BackgroundFetch] Task started:', taskId);

        const online = await isOnline();
        if (online) {
          await performSync();
        }

        BackgroundFetch.finish(taskId);
      },
      async (taskId) => {
        console.log('[BackgroundFetch] Task timeout:', taskId);
        BackgroundFetch.finish(taskId);
      },
    );

    const status = await BackgroundFetch.status();
    console.log('[BackgroundFetch] Status:', status);
  } catch (error) {
    console.error('[BackgroundFetch] Configuration failed:', error);
  }
};

// Perform sync
export const performSync = async (): Promise<SyncResult> => {
  if (syncInProgress) {
    console.log('[SyncService] Sync already in progress, skipping');
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  const online = await isOnline();
  if (!online) {
    console.log('[SyncService] Device offline, skipping sync');
    return { success: false, synced: 0, failed: 0, errors: ['Device offline'] };
  }

  syncInProgress = true;
  useAppStore.getState().setSyncStatus({ isSyncing: true });

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const mutations = getPendingMutations();
    console.log(`[SyncService] Starting sync with ${mutations.length} pending mutations`);

    for (const mutation of mutations.slice(0, SYNC_CONFIG.batchSize)) {
      try {
        await executeMutation(mutation);
        removePendingMutation(mutation.id);
        result.synced += 1;
        console.log(`[SyncService] Synced mutation: ${mutation.operationName}`);
      } catch (error: any) {
        console.error(`[SyncService] Failed to sync mutation: ${mutation.operationName}`, error);

        if (shouldRetryMutation(mutation)) {
          updateMutationRetry(mutation.id, error.message);
        } else {
          // Max retries exceeded, remove from queue
          removePendingMutation(mutation.id);
          result.errors.push(`${mutation.operationName}: Max retries exceeded`);
        }

        result.failed += 1;
      }
    }

    // Update last sync timestamp
    const now = new Date().toISOString();
    storage.set('last_sync_at', now);

    useAppStore.getState().setSyncStatus({
      isSyncing: false,
      lastSyncAt: now,
      pendingChanges: getPendingMutations().length,
      error: result.errors.length > 0 ? result.errors[0] : null,
    });

    console.log(`[SyncService] Sync completed: ${result.synced} synced, ${result.failed} failed`);
  } catch (error: any) {
    console.error('[SyncService] Sync failed:', error);
    result.success = false;
    result.errors.push(error.message);

    useAppStore.getState().setSyncStatus({
      isSyncing: false,
      error: error.message,
    });
  } finally {
    syncInProgress = false;
  }

  return result;
};

// Execute a single mutation
const executeMutation = async (mutation: OfflineMutation): Promise<void> => {
  const client = getApolloClient();

  // Parse the query string back to a document
  const { gql } = await import('@apollo/client');
  const document = gql(mutation.query);

  await client.mutate({
    mutation: document,
    variables: mutation.variables,
  });
};

// Force sync
export const forceSync = async (): Promise<SyncResult> => {
  syncInProgress = false; // Reset flag to allow sync
  return performSync();
};

// Get sync status
export const getSyncStatus = () => {
  const lastSyncAt = storage.getString('last_sync_at');
  const pendingCount = getPendingMutations().length;

  return {
    lastSyncAt: lastSyncAt || null,
    pendingChanges: pendingCount,
    isSyncing: syncInProgress,
  };
};

// Clear sync data
export const clearSyncData = (): void => {
  storage.clearAll();
};
