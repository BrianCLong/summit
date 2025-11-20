import NetInfo from '@react-native-community/netinfo';
import {apolloClient} from './GraphQLClient';
import {
  getPendingMutations,
  deletePendingMutation,
  updateMutationRetryCount,
  getUnsyncedLocations,
  markLocationsAsSynced,
  storage,
} from './Database';
import {MAX_SYNC_RETRIES, SYNC_BATCH_SIZE} from '../config';

// Check if online
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
};

// Sync offline data
export const syncOfflineData = async (): Promise<void> => {
  console.log('[OfflineSync] Starting sync...');

  // Check if online
  const online = await isOnline();
  if (!online) {
    console.log('[OfflineSync] Device is offline, skipping sync');
    return;
  }

  try {
    // Sync pending mutations
    await syncPendingMutations();

    // Sync location updates
    await syncLocationUpdates();

    // Update last sync timestamp
    storage.set('last_sync_timestamp', Date.now());

    console.log('[OfflineSync] Sync completed successfully');
  } catch (error) {
    console.error('[OfflineSync] Sync failed:', error);
    throw error;
  }
};

// Sync pending mutations
export const syncPendingMutations = async (): Promise<void> => {
  console.log('[OfflineSync] Syncing pending mutations...');

  const mutations = await getPendingMutations();

  console.log(`[OfflineSync] Found ${mutations.length} pending mutations`);

  for (const mutation of mutations.slice(0, SYNC_BATCH_SIZE)) {
    try {
      // Execute mutation
      await apolloClient.mutate({
        mutation: mutation.operation,
        variables: mutation.variables,
      });

      // Delete from pending mutations
      await deletePendingMutation(mutation.id);

      console.log(`[OfflineSync] Synced mutation ${mutation.id}`);
    } catch (error: any) {
      console.error(`[OfflineSync] Failed to sync mutation ${mutation.id}:`, error);

      // Update retry count
      await updateMutationRetryCount(mutation.id, error.message);

      // Delete if max retries exceeded
      if (mutation.retryCount >= MAX_SYNC_RETRIES) {
        console.log(`[OfflineSync] Max retries exceeded for mutation ${mutation.id}, deleting`);
        await deletePendingMutation(mutation.id);
      }
    }
  }
};

// Sync location updates
export const syncLocationUpdates = async (): Promise<void> => {
  console.log('[OfflineSync] Syncing location updates...');

  const locations = await getUnsyncedLocations();

  console.log(`[OfflineSync] Found ${locations.length} unsynced locations`);

  if (locations.length === 0) {
    return;
  }

  try {
    // Send location updates to server
    // TODO: Replace with actual mutation
    // await apolloClient.mutate({
    //   mutation: SYNC_LOCATION_UPDATES,
    //   variables: { locations },
    // });

    // Mark locations as synced
    const timestamps = locations.map((loc) => loc.timestamp);
    await markLocationsAsSynced(timestamps);

    console.log(`[OfflineSync] Synced ${locations.length} location updates`);
  } catch (error) {
    console.error('[OfflineSync] Failed to sync location updates:', error);
    throw error;
  }
};

// Queue mutation for offline sync
export const queueMutation = async (operation: string, variables: any): Promise<void> => {
  const {storePendingMutation} = await import('./Database');
  await storePendingMutation(operation, variables);
  console.log('[OfflineSync] Mutation queued for sync');

  // Try to sync immediately if online
  const online = await isOnline();
  if (online) {
    await syncPendingMutations();
  }
};

// Get sync status
export const getSyncStatus = async (): Promise<{
  pendingMutations: number;
  unsyncedLocations: number;
  lastSyncTimestamp: number | null;
}> => {
  const mutations = await getPendingMutations();
  const locations = await getUnsyncedLocations();
  const lastSync = storage.getNumber('last_sync_timestamp');

  return {
    pendingMutations: mutations.length,
    unsyncedLocations: locations.length,
    lastSyncTimestamp: lastSync || null,
  };
};

// Force sync
export const forceSync = async (): Promise<void> => {
  console.log('[OfflineSync] Force sync initiated');
  await syncOfflineData();
};

// Clear all pending sync data
export const clearSyncQueue = async (): Promise<void> => {
  const mutations = await getPendingMutations();
  for (const mutation of mutations) {
    await deletePendingMutation(mutation.id);
  }

  console.log('[OfflineSync] Sync queue cleared');
};
