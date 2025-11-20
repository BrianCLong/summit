import {useEffect, useState, useCallback} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import {syncMutations, getSyncQueueStatus} from '../services/OfflineSync';

export interface SyncStatus {
  pending: number;
  lastSync: number | null;
  status: string;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * Hook for managing offline sync status and triggering syncs
 */
export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    lastSync: null,
    status: 'idle',
    isOnline: true,
    isSyncing: false,
  });

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const status = await getSyncQueueStatus();
      const netState = await NetInfo.fetch();

      setSyncStatus((prev) => ({
        ...prev,
        pending: status.pending,
        lastSync: status.lastSync,
        status: status.status,
        isOnline: netState.isConnected === true && netState.isInternetReachable === true,
      }));
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (syncStatus.isSyncing) {
      return;
    }

    setSyncStatus((prev) => ({...prev, isSyncing: true}));

    try {
      await syncMutations();
      await fetchSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus((prev) => ({...prev, isSyncing: false}));
    }
  }, [syncStatus.isSyncing, fetchSyncStatus]);

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable === true;

      setSyncStatus((prev) => ({...prev, isOnline}));

      // Auto-sync when coming back online
      if (isOnline && syncStatus.pending > 0 && !syncStatus.isSyncing) {
        triggerSync();
      }
    });

    return unsubscribe;
  }, [syncStatus.pending, syncStatus.isSyncing, triggerSync]);

  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchSyncStatus();

        // Trigger sync if online and have pending items
        if (syncStatus.isOnline && syncStatus.pending > 0 && !syncStatus.isSyncing) {
          triggerSync();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchSyncStatus, syncStatus.isOnline, syncStatus.pending, syncStatus.isSyncing, triggerSync]);

  // Initial fetch
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  return {
    syncStatus,
    triggerSync,
    refreshStatus: fetchSyncStatus,
  };
};
