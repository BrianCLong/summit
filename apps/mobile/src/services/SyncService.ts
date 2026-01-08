import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import BackgroundFetch from 'react-native-background-fetch';
import { synchronize } from '@nozbe/watermelondb/sync';

import { SYNC_CONFIG, FEATURES, API_CONFIG } from '@/config';
import { database } from './WatermelonDB';
import { useAppStore } from '@/stores/appStore';
import { getAuthToken } from './AuthService';

export interface SyncResult {
  success: boolean;
  error?: string;
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
  const state = await NetInfo.fetch();
  if (state.isConnected && state.isInternetReachable) {
    await performSync();
  }

  console.log('[SyncService] Initialized (WatermelonDB)');
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
        await performSync();
        BackgroundFetch.finish(taskId);
      },
      async (taskId) => {
        console.log('[BackgroundFetch] Task timeout:', taskId);
        BackgroundFetch.finish(taskId);
      },
    );
  } catch (error) {
    console.error('[BackgroundFetch] Configuration failed:', error);
  }
};

// Perform sync
export const performSync = async (): Promise<SyncResult> => {
  if (syncInProgress) {
    console.log('[SyncService] Sync already in progress, skipping');
    return { success: true };
  }

  const state = await NetInfo.fetch();
  if (!state.isConnected || !state.isInternetReachable) {
    console.log('[SyncService] Device offline, skipping sync');
    return { success: false, error: 'Device offline' };
  }

  syncInProgress = true;
  useAppStore.getState().setSyncStatus({ isSyncing: true });

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        const token = await getAuthToken();
        const urlParams = new URLSearchParams({
          lastPulledAt: lastPulledAt ? new String(lastPulledAt) : '',
          schemaVersion: String(schemaVersion),
          migration: JSON.stringify(migration),
        });

        const response = await fetch(`${API_CONFIG.baseUrl}/sync/pull?${urlParams}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const { changes, timestamp } = await response.json();
        return { changes, timestamp };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        const token = await getAuthToken();
        const response = await fetch(
          `${API_CONFIG.baseUrl}/sync/push?lastPulledAt=${lastPulledAt}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(changes),
          },
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }
      },
      migrationsEnabledAtVersion: 1,
    });

    const now = new Date().toISOString();
    useAppStore.getState().setSyncStatus({
      isSyncing: false,
      lastSyncAt: now,
      error: null,
    });
    console.log('[SyncService] Sync completed successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[SyncService] Sync failed:', error);
    useAppStore.getState().setSyncStatus({
      isSyncing: false,
      error: error.message,
    });
    return { success: false, error: error.message };
  } finally {
    syncInProgress = false;
  }
};

// Force sync
export const forceSync = async (): Promise<SyncResult> => {
  syncInProgress = false; // Reset flag to allow sync
  return performSync();
};
