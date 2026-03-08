"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceSync = exports.performSync = exports.cleanupSyncService = exports.initializeSyncService = void 0;
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const react_native_background_fetch_1 = __importDefault(require("react-native-background-fetch"));
const sync_1 = require("@nozbe/watermelondb/sync");
const config_1 = require("@/config");
const WatermelonDB_1 = require("./WatermelonDB");
const appStore_1 = require("@/stores/appStore");
const AuthService_1 = require("./AuthService");
let syncInProgress = false;
let networkUnsubscribe = null;
// Initialize sync service
const initializeSyncService = async () => {
    // Listen for network changes
    networkUnsubscribe = netinfo_1.default.addEventListener(handleNetworkChange);
    // Setup background fetch for iOS/Android
    if (config_1.FEATURES.enableBackgroundSync) {
        await setupBackgroundSync();
    }
    // Perform initial sync if online
    const state = await netinfo_1.default.fetch();
    if (state.isConnected && state.isInternetReachable) {
        await (0, exports.performSync)();
    }
    console.log('[SyncService] Initialized (WatermelonDB)');
};
exports.initializeSyncService = initializeSyncService;
// Cleanup sync service
const cleanupSyncService = () => {
    if (networkUnsubscribe) {
        networkUnsubscribe();
        networkUnsubscribe = null;
    }
};
exports.cleanupSyncService = cleanupSyncService;
// Handle network state changes
const handleNetworkChange = async (state) => {
    console.log('[SyncService] Network state changed:', state.isConnected);
    appStore_1.useAppStore.getState().setOfflineMode(!state.isConnected);
    if (state.isConnected && state.isInternetReachable) {
        // Device came online, trigger sync
        await (0, exports.performSync)();
    }
};
// Setup background sync
const setupBackgroundSync = async () => {
    try {
        await react_native_background_fetch_1.default.configure({
            minimumFetchInterval: 15, // minutes
            stopOnTerminate: false,
            startOnBoot: true,
            enableHeadless: true,
            requiredNetworkType: react_native_background_fetch_1.default.NETWORK_TYPE_ANY,
        }, async (taskId) => {
            console.log('[BackgroundFetch] Task started:', taskId);
            await (0, exports.performSync)();
            react_native_background_fetch_1.default.finish(taskId);
        }, async (taskId) => {
            console.log('[BackgroundFetch] Task timeout:', taskId);
            react_native_background_fetch_1.default.finish(taskId);
        });
    }
    catch (error) {
        console.error('[BackgroundFetch] Configuration failed:', error);
    }
};
// Perform sync
const performSync = async () => {
    if (syncInProgress) {
        console.log('[SyncService] Sync already in progress, skipping');
        return { success: true };
    }
    const state = await netinfo_1.default.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
        console.log('[SyncService] Device offline, skipping sync');
        return { success: false, error: 'Device offline' };
    }
    syncInProgress = true;
    appStore_1.useAppStore.getState().setSyncStatus({ isSyncing: true });
    try {
        await (0, sync_1.synchronize)({
            database: WatermelonDB_1.database,
            pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                const token = await (0, AuthService_1.getAuthToken)();
                const urlParams = new URLSearchParams({
                    lastPulledAt: lastPulledAt ? new String(lastPulledAt) : '',
                    schemaVersion: String(schemaVersion),
                    migration: JSON.stringify(migration),
                });
                const response = await fetch(`${config_1.API_CONFIG.baseUrl}/sync/pull?${urlParams}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
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
                const token = await (0, AuthService_1.getAuthToken)();
                const response = await fetch(`${config_1.API_CONFIG.baseUrl}/sync/push?lastPulledAt=${lastPulledAt}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(changes),
                });
                if (!response.ok) {
                    throw new Error(await response.text());
                }
            },
            migrationsEnabledAtVersion: 1,
        });
        const now = new Date().toISOString();
        appStore_1.useAppStore.getState().setSyncStatus({
            isSyncing: false,
            lastSyncAt: now,
            error: null,
        });
        console.log('[SyncService] Sync completed successfully');
        return { success: true };
    }
    catch (error) {
        console.error('[SyncService] Sync failed:', error);
        appStore_1.useAppStore.getState().setSyncStatus({
            isSyncing: false,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
    finally {
        syncInProgress = false;
    }
};
exports.performSync = performSync;
// Force sync
const forceSync = async () => {
    syncInProgress = false; // Reset flag to allow sync
    return (0, exports.performSync)();
};
exports.forceSync = forceSync;
