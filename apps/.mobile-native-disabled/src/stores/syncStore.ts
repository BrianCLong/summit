import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncQueueItem {
  id: string;
  type: 'mutation' | 'upload' | 'location';
  operation: string;
  data: any;
  retryCount: number;
  lastAttempt: number | null;
  createdAt: number;
  error?: string;
}

interface ConflictResolution {
  id: string;
  localData: any;
  serverData: any;
  strategy: 'local' | 'server' | 'merge' | 'manual';
  resolvedAt: number | null;
}

interface SyncState {
  // Sync queue
  queue: SyncQueueItem[];

  // Sync status
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncErrors: string[];

  // Conflict resolution
  conflicts: ConflictResolution[];

  // Statistics
  totalSynced: number;
  totalFailed: number;

  // Actions
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'lastAttempt' | 'createdAt'>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<SyncQueueItem>) => void;
  clearQueue: () => void;

  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;

  addConflict: (conflict: Omit<ConflictResolution, 'resolvedAt'>) => void;
  resolveConflict: (id: string, strategy: ConflictResolution['strategy']) => void;
  removeConflict: (id: string) => void;

  incrementSynced: () => void;
  incrementFailed: () => void;
  resetStats: () => void;

  reset: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    immer((set) => ({
      // Initial state
      queue: [],
      isSyncing: false,
      lastSyncTime: null,
      syncErrors: [],
      conflicts: [],
      totalSynced: 0,
      totalFailed: 0,

      // Queue actions
      addToQueue: (item) =>
        set((state) => {
          const newItem: SyncQueueItem = {
            ...item,
            id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retryCount: 0,
            lastAttempt: null,
            createdAt: Date.now(),
          };
          state.queue.push(newItem);
        }),

      removeFromQueue: (id) =>
        set((state) => {
          state.queue = state.queue.filter((item) => item.id !== id);
        }),

      updateQueueItem: (id, updates) =>
        set((state) => {
          const item = state.queue.find((i) => i.id === id);
          if (item) {
            Object.assign(item, updates);
          }
        }),

      clearQueue: () =>
        set((state) => {
          state.queue = [];
        }),

      // Sync status actions
      setSyncing: (syncing) =>
        set((state) => {
          state.isSyncing = syncing;
        }),

      setLastSyncTime: (time) =>
        set((state) => {
          state.lastSyncTime = time;
        }),

      addSyncError: (error) =>
        set((state) => {
          state.syncErrors.push(error);
          // Keep only last 50 errors
          if (state.syncErrors.length > 50) {
            state.syncErrors = state.syncErrors.slice(-50);
          }
        }),

      clearSyncErrors: () =>
        set((state) => {
          state.syncErrors = [];
        }),

      // Conflict actions
      addConflict: (conflict) =>
        set((state) => {
          state.conflicts.push({
            ...conflict,
            resolvedAt: null,
          });
        }),

      resolveConflict: (id, strategy) =>
        set((state) => {
          const conflict = state.conflicts.find((c) => c.id === id);
          if (conflict) {
            conflict.strategy = strategy;
            conflict.resolvedAt = Date.now();
          }
        }),

      removeConflict: (id) =>
        set((state) => {
          state.conflicts = state.conflicts.filter((c) => c.id !== id);
        }),

      // Statistics actions
      incrementSynced: () =>
        set((state) => {
          state.totalSynced += 1;
        }),

      incrementFailed: () =>
        set((state) => {
          state.totalFailed += 1;
        }),

      resetStats: () =>
        set((state) => {
          state.totalSynced = 0;
          state.totalFailed = 0;
        }),

      reset: () =>
        set((state) => {
          state.queue = [];
          state.isSyncing = false;
          state.lastSyncTime = null;
          state.syncErrors = [];
          state.conflicts = [];
          state.totalSynced = 0;
          state.totalFailed = 0;
        }),
    })),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist everything except isSyncing
      partialize: (state) => ({
        queue: state.queue,
        lastSyncTime: state.lastSyncTime,
        conflicts: state.conflicts,
        totalSynced: state.totalSynced,
        totalFailed: state.totalFailed,
      }),
    },
  ),
);

// Selectors
export const selectQueue = (state: SyncState) => state.queue;
export const selectQueueSize = (state: SyncState) => state.queue.length;
export const selectIsSyncing = (state: SyncState) => state.isSyncing;
export const selectConflicts = (state: SyncState) => state.conflicts;
export const selectUnresolvedConflicts = (state: SyncState) =>
  state.conflicts.filter((c) => !c.resolvedAt);
export const selectSyncStats = (state: SyncState) => ({
  totalSynced: state.totalSynced,
  totalFailed: state.totalFailed,
  successRate: state.totalSynced / (state.totalSynced + state.totalFailed) || 0,
});
