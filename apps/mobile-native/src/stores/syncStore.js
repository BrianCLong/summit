"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSyncStats = exports.selectUnresolvedConflicts = exports.selectConflicts = exports.selectIsSyncing = exports.selectQueueSize = exports.selectQueue = exports.useSyncStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const immer_1 = require("zustand/middleware/immer");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
exports.useSyncStore = (0, zustand_1.create)()((0, middleware_1.persist)((0, immer_1.immer)((set) => ({
    // Initial state
    queue: [],
    isSyncing: false,
    lastSyncTime: null,
    syncErrors: [],
    conflicts: [],
    totalSynced: 0,
    totalFailed: 0,
    // Queue actions
    addToQueue: (item) => set((state) => {
        const newItem = {
            ...item,
            id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retryCount: 0,
            lastAttempt: null,
            createdAt: Date.now(),
        };
        state.queue.push(newItem);
    }),
    removeFromQueue: (id) => set((state) => {
        state.queue = state.queue.filter((item) => item.id !== id);
    }),
    updateQueueItem: (id, updates) => set((state) => {
        const item = state.queue.find((i) => i.id === id);
        if (item) {
            Object.assign(item, updates);
        }
    }),
    clearQueue: () => set((state) => {
        state.queue = [];
    }),
    // Sync status actions
    setSyncing: (syncing) => set((state) => {
        state.isSyncing = syncing;
    }),
    setLastSyncTime: (time) => set((state) => {
        state.lastSyncTime = time;
    }),
    addSyncError: (error) => set((state) => {
        state.syncErrors.push(error);
        // Keep only last 50 errors
        if (state.syncErrors.length > 50) {
            state.syncErrors = state.syncErrors.slice(-50);
        }
    }),
    clearSyncErrors: () => set((state) => {
        state.syncErrors = [];
    }),
    // Conflict actions
    addConflict: (conflict) => set((state) => {
        state.conflicts.push({
            ...conflict,
            resolvedAt: null,
        });
    }),
    resolveConflict: (id, strategy) => set((state) => {
        const conflict = state.conflicts.find((c) => c.id === id);
        if (conflict) {
            conflict.strategy = strategy;
            conflict.resolvedAt = Date.now();
        }
    }),
    removeConflict: (id) => set((state) => {
        state.conflicts = state.conflicts.filter((c) => c.id !== id);
    }),
    // Statistics actions
    incrementSynced: () => set((state) => {
        state.totalSynced += 1;
    }),
    incrementFailed: () => set((state) => {
        state.totalFailed += 1;
    }),
    resetStats: () => set((state) => {
        state.totalSynced = 0;
        state.totalFailed = 0;
    }),
    reset: () => set((state) => {
        state.queue = [];
        state.isSyncing = false;
        state.lastSyncTime = null;
        state.syncErrors = [];
        state.conflicts = [];
        state.totalSynced = 0;
        state.totalFailed = 0;
    }),
})), {
    name: 'sync-storage',
    storage: (0, middleware_1.createJSONStorage)(() => async_storage_1.default),
    // Persist everything except isSyncing
    partialize: (state) => ({
        queue: state.queue,
        lastSyncTime: state.lastSyncTime,
        conflicts: state.conflicts,
        totalSynced: state.totalSynced,
        totalFailed: state.totalFailed,
    }),
}));
// Selectors
const selectQueue = (state) => state.queue;
exports.selectQueue = selectQueue;
const selectQueueSize = (state) => state.queue.length;
exports.selectQueueSize = selectQueueSize;
const selectIsSyncing = (state) => state.isSyncing;
exports.selectIsSyncing = selectIsSyncing;
const selectConflicts = (state) => state.conflicts;
exports.selectConflicts = selectConflicts;
const selectUnresolvedConflicts = (state) => state.conflicts.filter((c) => !c.resolvedAt);
exports.selectUnresolvedConflicts = selectUnresolvedConflicts;
const selectSyncStats = (state) => ({
    totalSynced: state.totalSynced,
    totalFailed: state.totalFailed,
    successRate: state.totalSynced / (state.totalSynced + state.totalFailed) || 0,
});
exports.selectSyncStats = selectSyncStats;
