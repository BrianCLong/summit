"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectPreferences = exports.selectOfflineMode = exports.selectSyncStatus = exports.selectIsAuthenticated = exports.selectUser = exports.useAppStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const immer_1 = require("zustand/middleware/immer");
const defaultPreferences = {
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
exports.useAppStore = (0, zustand_1.create)()((0, middleware_1.persist)((0, immer_1.immer)((set) => ({
    ...initialState,
    setUser: (user) => set((state) => {
        state.user = user;
        state.isAuthenticated = !!user;
    }),
    setAuthenticated: (isAuthenticated) => set((state) => {
        state.isAuthenticated = isAuthenticated;
    }),
    setSyncStatus: (status) => set((state) => {
        state.syncStatus = { ...state.syncStatus, ...status };
    }),
    setOfflineMode: (offline) => set((state) => {
        state.offlineMode = offline;
        state.syncStatus.offlineMode = offline;
    }),
    setLoading: (loading) => set((state) => {
        state.isLoading = loading;
    }),
    setError: (error) => set((state) => {
        state.error = error;
    }),
    updatePreferences: (prefs) => set((state) => {
        state.preferences = { ...state.preferences, ...prefs };
    }),
    reset: () => set(initialState),
})), {
    name: 'app-store',
    storage: (0, middleware_1.createJSONStorage)(() => async_storage_1.default),
    partialize: (state) => ({
        preferences: state.preferences,
    }),
}));
// Selectors
const selectUser = (state) => state.user;
exports.selectUser = selectUser;
const selectIsAuthenticated = (state) => state.isAuthenticated;
exports.selectIsAuthenticated = selectIsAuthenticated;
const selectSyncStatus = (state) => state.syncStatus;
exports.selectSyncStatus = selectSyncStatus;
const selectOfflineMode = (state) => state.offlineMode;
exports.selectOfflineMode = selectOfflineMode;
const selectPreferences = (state) => state.preferences;
exports.selectPreferences = selectPreferences;
