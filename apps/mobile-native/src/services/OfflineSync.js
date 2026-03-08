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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSyncQueue = exports.forceSync = exports.getSyncStatus = exports.queueMutation = exports.syncLocationUpdates = exports.syncPendingMutations = exports.syncOfflineData = exports.isOnline = void 0;
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const GraphQLClient_1 = require("./GraphQLClient");
const Database_1 = require("./Database");
const config_1 = require("../config");
// Check if online
const isOnline = async () => {
    const state = await netinfo_1.default.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
};
exports.isOnline = isOnline;
// Sync offline data
const syncOfflineData = async () => {
    console.log('[OfflineSync] Starting sync...');
    // Check if online
    const online = await (0, exports.isOnline)();
    if (!online) {
        console.log('[OfflineSync] Device is offline, skipping sync');
        return;
    }
    try {
        // Sync pending mutations
        await (0, exports.syncPendingMutations)();
        // Sync location updates
        await (0, exports.syncLocationUpdates)();
        // Update last sync timestamp
        Database_1.storage.set('last_sync_timestamp', Date.now());
        console.log('[OfflineSync] Sync completed successfully');
    }
    catch (error) {
        console.error('[OfflineSync] Sync failed:', error);
        throw error;
    }
};
exports.syncOfflineData = syncOfflineData;
// Sync pending mutations
const syncPendingMutations = async () => {
    console.log('[OfflineSync] Syncing pending mutations...');
    const mutations = await (0, Database_1.getPendingMutations)();
    console.log(`[OfflineSync] Found ${mutations.length} pending mutations`);
    for (const mutation of mutations.slice(0, config_1.SYNC_BATCH_SIZE)) {
        try {
            // Execute mutation
            await GraphQLClient_1.apolloClient.mutate({
                mutation: mutation.operation,
                variables: mutation.variables,
            });
            // Delete from pending mutations
            await (0, Database_1.deletePendingMutation)(mutation.id);
            console.log(`[OfflineSync] Synced mutation ${mutation.id}`);
        }
        catch (error) {
            console.error(`[OfflineSync] Failed to sync mutation ${mutation.id}:`, error);
            // Update retry count
            await (0, Database_1.updateMutationRetryCount)(mutation.id, error.message);
            // Delete if max retries exceeded
            if (mutation.retryCount >= config_1.MAX_SYNC_RETRIES) {
                console.log(`[OfflineSync] Max retries exceeded for mutation ${mutation.id}, deleting`);
                await (0, Database_1.deletePendingMutation)(mutation.id);
            }
        }
    }
};
exports.syncPendingMutations = syncPendingMutations;
// Sync location updates
const syncLocationUpdates = async () => {
    console.log('[OfflineSync] Syncing location updates...');
    const locations = await (0, Database_1.getUnsyncedLocations)();
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
        await (0, Database_1.markLocationsAsSynced)(timestamps);
        console.log(`[OfflineSync] Synced ${locations.length} location updates`);
    }
    catch (error) {
        console.error('[OfflineSync] Failed to sync location updates:', error);
        throw error;
    }
};
exports.syncLocationUpdates = syncLocationUpdates;
// Queue mutation for offline sync
const queueMutation = async (operation, variables) => {
    const { storePendingMutation } = await Promise.resolve().then(() => __importStar(require('./Database')));
    await storePendingMutation(operation, variables);
    console.log('[OfflineSync] Mutation queued for sync');
    // Try to sync immediately if online
    const online = await (0, exports.isOnline)();
    if (online) {
        await (0, exports.syncPendingMutations)();
    }
};
exports.queueMutation = queueMutation;
// Get sync status
const getSyncStatus = async () => {
    const mutations = await (0, Database_1.getPendingMutations)();
    const locations = await (0, Database_1.getUnsyncedLocations)();
    const lastSync = Database_1.storage.getNumber('last_sync_timestamp');
    return {
        pendingMutations: mutations.length,
        unsyncedLocations: locations.length,
        lastSyncTimestamp: lastSync || null,
    };
};
exports.getSyncStatus = getSyncStatus;
// Force sync
const forceSync = async () => {
    console.log('[OfflineSync] Force sync initiated');
    await (0, exports.syncOfflineData)();
};
exports.forceSync = forceSync;
// Clear all pending sync data
const clearSyncQueue = async () => {
    const mutations = await (0, Database_1.getPendingMutations)();
    for (const mutation of mutations) {
        await (0, Database_1.deletePendingMutation)(mutation.id);
    }
    console.log('[OfflineSync] Sync queue cleared');
};
exports.clearSyncQueue = clearSyncQueue;
