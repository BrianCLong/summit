"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectError = exports.selectIsLoading = exports.selectIsOnline = exports.selectSettings = exports.useAppStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const immer_1 = require("zustand/middleware/immer");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const defaultSettings = {
    theme: 'auto',
    language: 'en',
    notificationsEnabled: true,
    locationTrackingEnabled: false,
    offlineModeEnabled: true,
    syncOnWifiOnly: false,
    analyticsEnabled: true,
};
exports.useAppStore = (0, zustand_1.create)()((0, middleware_1.persist)((0, immer_1.immer)((set) => ({
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
    setInitialized: (initialized) => set((state) => {
        state.isInitialized = initialized;
    }),
    setOnlineStatus: (online) => set((state) => {
        state.isOnline = online;
    }),
    setBackgroundMode: (background) => set((state) => {
        state.isBackgroundMode = background;
    }),
    updateSettings: (newSettings) => set((state) => {
        state.settings = { ...state.settings, ...newSettings };
    }),
    setActiveScreen: (screen) => set((state) => {
        state.activeScreen = screen;
    }),
    setLoading: (loading) => set((state) => {
        state.isLoading = loading;
    }),
    setError: (error) => set((state) => {
        state.error = error;
    }),
    setStartupTime: (time) => set((state) => {
        state.startupTime = time;
    }),
    setLastSyncTime: (time) => set((state) => {
        state.lastSyncTime = time;
    }),
    reset: () => set((state) => {
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
})), {
    name: 'app-storage',
    storage: (0, middleware_1.createJSONStorage)(() => async_storage_1.default),
    // Only persist settings and some state
    partialize: (state) => ({
        settings: state.settings,
        lastSyncTime: state.lastSyncTime,
    }),
}));
// Selectors for optimized re-renders
const selectSettings = (state) => state.settings;
exports.selectSettings = selectSettings;
const selectIsOnline = (state) => state.isOnline;
exports.selectIsOnline = selectIsOnline;
const selectIsLoading = (state) => state.isLoading;
exports.selectIsLoading = selectIsLoading;
const selectError = (state) => state.error;
exports.selectError = selectError;
