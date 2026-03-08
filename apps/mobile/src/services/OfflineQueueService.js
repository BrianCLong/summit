"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOnline = exports.clearPendingMutations = exports.getPendingCount = exports.shouldRetryMutation = exports.updateMutationRetry = exports.removePendingMutation = exports.queueOfflineMutation = exports.getPendingMutations = void 0;
const react_native_mmkv_1 = require("react-native-mmkv");
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const uuid_1 = require("uuid");
const config_1 = require("@/config");
const storage = new react_native_mmkv_1.MMKV({ id: 'offline-queue' });
const QUEUE_KEY = 'pending_mutations';
// Get all pending mutations
const getPendingMutations = () => {
    const data = storage.getString(QUEUE_KEY);
    if (!data)
        return [];
    try {
        return JSON.parse(data);
    }
    catch {
        return [];
    }
};
exports.getPendingMutations = getPendingMutations;
// Queue a mutation for offline sync
const queueOfflineMutation = (operation, priority = 0) => {
    const id = (0, uuid_1.v4)();
    const mutation = {
        id,
        operationName: operation.operationName || 'UnnamedMutation',
        query: operation.query.loc?.source.body || '',
        variables: operation.variables,
        context: {},
        createdAt: new Date().toISOString(),
        retryCount: 0,
        priority,
    };
    const mutations = (0, exports.getPendingMutations)();
    mutations.push(mutation);
    // Sort by priority (higher first) then by creation time
    mutations.sort((a, b) => {
        if (b.priority !== a.priority)
            return b.priority - a.priority;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    storage.set(QUEUE_KEY, JSON.stringify(mutations));
    console.log(`[OfflineQueue] Queued mutation: ${mutation.operationName}`);
    return id;
};
exports.queueOfflineMutation = queueOfflineMutation;
// Remove a mutation from the queue
const removePendingMutation = (id) => {
    const mutations = (0, exports.getPendingMutations)().filter((m) => m.id !== id);
    storage.set(QUEUE_KEY, JSON.stringify(mutations));
};
exports.removePendingMutation = removePendingMutation;
// Update mutation retry count
const updateMutationRetry = (id, error) => {
    const mutations = (0, exports.getPendingMutations)();
    const index = mutations.findIndex((m) => m.id === id);
    if (index !== -1) {
        mutations[index].retryCount += 1;
        mutations[index].lastError = error;
        storage.set(QUEUE_KEY, JSON.stringify(mutations));
    }
};
exports.updateMutationRetry = updateMutationRetry;
// Check if mutation should be retried
const shouldRetryMutation = (mutation) => {
    return mutation.retryCount < config_1.SYNC_CONFIG.maxRetries;
};
exports.shouldRetryMutation = shouldRetryMutation;
// Get count of pending mutations
const getPendingCount = () => {
    return (0, exports.getPendingMutations)().length;
};
exports.getPendingCount = getPendingCount;
// Clear all pending mutations
const clearPendingMutations = () => {
    storage.delete(QUEUE_KEY);
};
exports.clearPendingMutations = clearPendingMutations;
// Check if device is online
const isOnline = async () => {
    const state = await netinfo_1.default.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
};
exports.isOnline = isOnline;
