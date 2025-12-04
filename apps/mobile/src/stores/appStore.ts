import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { immer } from 'zustand/middleware/immer';

import type { SyncStatus, UserPreferences, User } from '@/types';

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;

  // Sync state
  syncStatus: SyncStatus;

  // Offline mode
  offlineMode: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Preferences
  preferences: UserPreferences;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  setOfflineMode: (offline: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  mapStyle: 'dark',
  notifications: {
    alerts: true,
    updates: true,
    mentions: true,
    sound: true,
    vibration: true,
  },
  offlineSettings: {
    autoSync: true,
    syncOnWifiOnly: false,
    maxOfflineData: 100,
  },
  displaySettings: {
    showConfidence: true,
    showClassification: true,
    compactMode: false,
  },
};

const initialState = {
  user: null,
  isAuthenticated: false,
  syncStatus: {
    lastSyncAt: null,
    pendingChanges: 0,
    isSyncing: false,
    error: null,
    offlineMode: false,
  },
  offlineMode: false,
  isLoading: false,
  error: null,
  preferences: defaultPreferences,
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
        }),

      setAuthenticated: (isAuthenticated) =>
        set((state) => {
          state.isAuthenticated = isAuthenticated;
        }),

      setSyncStatus: (status) =>
        set((state) => {
          state.syncStatus = { ...state.syncStatus, ...status };
        }),

      setOfflineMode: (offline) =>
        set((state) => {
          state.offlineMode = offline;
          state.syncStatus.offlineMode = offline;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      updatePreferences: (prefs) =>
        set((state) => {
          state.preferences = { ...state.preferences, ...prefs };
        }),

      reset: () => set(initialState),
    })),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    },
  ),
);

// Selectors
export const selectUser = (state: AppState) => state.user;
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectSyncStatus = (state: AppState) => state.syncStatus;
export const selectOfflineMode = (state: AppState) => state.offlineMode;
export const selectPreferences = (state: AppState) => state.preferences;
