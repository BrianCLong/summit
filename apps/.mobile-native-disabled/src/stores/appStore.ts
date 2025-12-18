import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {immer} from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  locationTrackingEnabled: boolean;
  offlineModeEnabled: boolean;
  syncOnWifiOnly: boolean;
  analyticsEnabled: boolean;
}

interface AppState {
  // App lifecycle
  isInitialized: boolean;
  isOnline: boolean;
  isBackgroundMode: boolean;

  // Settings
  settings: AppSettings;

  // UI state
  activeScreen: string;
  isLoading: boolean;
  error: string | null;

  // Performance metrics
  startupTime: number | null;
  lastSyncTime: number | null;

  // Actions
  setInitialized: (initialized: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  setBackgroundMode: (background: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActiveScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStartupTime: (time: number) => void;
  setLastSyncTime: (time: number) => void;
  reset: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  language: 'en',
  notificationsEnabled: true,
  locationTrackingEnabled: false,
  offlineModeEnabled: true,
  syncOnWifiOnly: false,
  analyticsEnabled: true,
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial state
      isInitialized: false,
      isOnline: true,
      isBackgroundMode: false,
      settings: defaultSettings,
      activeScreen: 'Home',
      isLoading: false,
      error: null,
      startupTime: null,
      lastSyncTime: null,

      // Actions
      setInitialized: (initialized) =>
        set((state) => {
          state.isInitialized = initialized;
        }),

      setOnlineStatus: (online) =>
        set((state) => {
          state.isOnline = online;
        }),

      setBackgroundMode: (background) =>
        set((state) => {
          state.isBackgroundMode = background;
        }),

      updateSettings: (newSettings) =>
        set((state) => {
          state.settings = {...state.settings, ...newSettings};
        }),

      setActiveScreen: (screen) =>
        set((state) => {
          state.activeScreen = screen;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      setStartupTime: (time) =>
        set((state) => {
          state.startupTime = time;
        }),

      setLastSyncTime: (time) =>
        set((state) => {
          state.lastSyncTime = time;
        }),

      reset: () =>
        set((state) => {
          state.isInitialized = false;
          state.isOnline = true;
          state.isBackgroundMode = false;
          state.settings = defaultSettings;
          state.activeScreen = 'Home';
          state.isLoading = false;
          state.error = null;
          state.startupTime = null;
          state.lastSyncTime = null;
        }),
    })),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist settings and some state
      partialize: (state) => ({
        settings: state.settings,
        lastSyncTime: state.lastSyncTime,
      }),
    },
  ),
);

// Selectors for optimized re-renders
export const selectSettings = (state: AppState) => state.settings;
export const selectIsOnline = (state: AppState) => state.isOnline;
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectError = (state: AppState) => state.error;
