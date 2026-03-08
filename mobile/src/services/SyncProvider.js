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
exports.SyncProvider = SyncProvider;
exports.useSync = useSync;
const react_1 = __importStar(require("react"));
const TaskManager = __importStar(require("expo-task-manager"));
const BackgroundFetch = __importStar(require("expo-background-fetch"));
const Network = __importStar(require("expo-network"));
const offlineStore_1 = require("./offlineStore");
const SYNC_TASK = 'summit-background-sync';
const DEFAULT_BATCH_SIZE = 25;
const SyncContext = (0, react_1.createContext)({
    enqueue: async () => { },
    syncNow: async () => { },
    queueSize: 0,
    status: 'idle',
    lowDataMode: false,
    setLowDataMode: () => { }
});
async function sendPayload(payload) {
    // Mock API interaction - In production, use authenticated fetch
    console.log('Sending payload:', payload);
    await new Promise(resolve => setTimeout(resolve, 50));
    // No random conflicts. Conflict logic should be driven by server response (409).
    return { success: true };
}
async function resolveConflict(record) {
    // Strategy: "Server Wins" but archive local copy
    console.log('Resolving conflict for record', record.id);
}
async function syncBatch(records) {
    const sentIds = [];
    for (const record of records) {
        const result = await sendPayload(record.payload);
        if (result.success) {
            sentIds.push(record.id);
        }
        else if (result.conflict) {
            await resolveConflict(record);
            sentIds.push(record.id);
        }
    }
    await (0, offlineStore_1.deleteRecords)(sentIds);
    return sentIds.length;
}
async function runSync(setters, lowDataMode) {
    const { setStatus, setLastSync, setLastError, setQueueSize } = setters;
    const network = await Network.getNetworkStateAsync();
    if (!network.isConnected) {
        setStatus('offline');
        return;
    }
    if (lowDataMode && network.type !== Network.NetworkStateType.WIFI) {
        setLastError('Low Data Mode: Waiting for WiFi');
        return;
    }
    setStatus('running');
    setLastError(undefined);
    try {
        let hasMore = true;
        while (hasMore) {
            const items = await (0, offlineStore_1.readOldest)(DEFAULT_BATCH_SIZE);
            if (!items.length) {
                hasMore = false;
            }
            else {
                await syncBatch(items);
            }
        }
        setLastSync(new Date());
        const remaining = await (0, offlineStore_1.countQueue)();
        setQueueSize(remaining);
    }
    catch (error) {
        setLastError(error.message);
        setStatus('error');
        return;
    }
    setStatus('idle');
}
async function registerBackgroundTask(sync) {
    const taskDefined = TaskManager.isTaskDefined(SYNC_TASK);
    if (!taskDefined) {
        TaskManager.defineTask(SYNC_TASK, async () => {
            try {
                await sync();
                return BackgroundFetch.BackgroundFetchResult.NewData;
            }
            catch (error) {
                console.error('Background sync failed', error);
                return BackgroundFetch.BackgroundFetchResult.Failed;
            }
        });
    }
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('Background fetch unavailable');
        return;
    }
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
    if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
            minimumInterval: 15 * 60,
            stopOnTerminate: false,
            startOnBoot: true
        });
    }
}
function SyncProvider({ children }) {
    const [lastSync, setLastSync] = (0, react_1.useState)();
    const [queueSize, setQueueSize] = (0, react_1.useState)(0);
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [lastError, setLastError] = (0, react_1.useState)();
    const [lowDataMode, setLowDataMode] = (0, react_1.useState)(false);
    const syncNow = (0, react_1.useCallback)(async () => {
        await (0, offlineStore_1.ensureOfflineStore)();
        await runSync({ setLastSync, setStatus, setLastError, setQueueSize }, lowDataMode);
    }, [lowDataMode]);
    (0, react_1.useEffect)(() => {
        (0, offlineStore_1.ensureOfflineStore)()
            .then(() => (0, offlineStore_1.countQueue)())
            .then(total => setQueueSize(total))
            .then(() => registerBackgroundTask(syncNow))
            .then(() => syncNow())
            .catch(error => setLastError(error.message));
    }, [syncNow]);
    const value = (0, react_1.useMemo)(() => ({
        lastSync,
        queueSize,
        status,
        lastError,
        lowDataMode,
        setLowDataMode,
        enqueue: async (payload) => {
            await (0, offlineStore_1.ensureOfflineStore)();
            await (0, offlineStore_1.enqueuePayload)(payload);
            setQueueSize(prev => prev + 1);
        },
        syncNow
    }), [lastError, lastSync, queueSize, status, lowDataMode, syncNow]);
    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
function useSync() {
    return (0, react_1.useContext)(SyncContext);
}
