"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const appStore_1 = require("../../src/stores/appStore");
// Reset store between tests
beforeEach(() => {
    appStore_1.useAppStore.getState().reset();
});
describe('appStore', () => {
    describe('user state', () => {
        it('sets user correctly', () => {
            const user = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'analyst',
                permissions: ['read', 'write'],
                clearance: 'SECRET',
            };
            appStore_1.useAppStore.getState().setUser(user);
            expect(appStore_1.useAppStore.getState().user).toEqual(user);
            expect(appStore_1.useAppStore.getState().isAuthenticated).toBe(true);
        });
        it('clears user on null', () => {
            appStore_1.useAppStore.getState().setUser({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'analyst',
                permissions: [],
                clearance: 'UNCLASSIFIED',
            });
            appStore_1.useAppStore.getState().setUser(null);
            expect(appStore_1.useAppStore.getState().user).toBeNull();
            expect(appStore_1.useAppStore.getState().isAuthenticated).toBe(false);
        });
    });
    describe('sync status', () => {
        it('updates sync status', () => {
            appStore_1.useAppStore.getState().setSyncStatus({
                isSyncing: true,
                pendingChanges: 5,
            });
            const status = appStore_1.useAppStore.getState().syncStatus;
            expect(status.isSyncing).toBe(true);
            expect(status.pendingChanges).toBe(5);
        });
        it('merges sync status updates', () => {
            appStore_1.useAppStore.getState().setSyncStatus({ pendingChanges: 10 });
            appStore_1.useAppStore.getState().setSyncStatus({ isSyncing: true });
            const status = appStore_1.useAppStore.getState().syncStatus;
            expect(status.pendingChanges).toBe(10);
            expect(status.isSyncing).toBe(true);
        });
    });
    describe('offline mode', () => {
        it('sets offline mode', () => {
            appStore_1.useAppStore.getState().setOfflineMode(true);
            expect(appStore_1.useAppStore.getState().offlineMode).toBe(true);
            expect(appStore_1.useAppStore.getState().syncStatus.offlineMode).toBe(true);
        });
    });
    describe('preferences', () => {
        it('updates preferences', () => {
            appStore_1.useAppStore.getState().updatePreferences({
                theme: 'light',
                mapStyle: 'satellite',
            });
            const prefs = appStore_1.useAppStore.getState().preferences;
            expect(prefs.theme).toBe('light');
            expect(prefs.mapStyle).toBe('satellite');
        });
        it('preserves other preferences when updating', () => {
            const originalNotifications = appStore_1.useAppStore.getState().preferences.notifications;
            appStore_1.useAppStore.getState().updatePreferences({ theme: 'light' });
            expect(appStore_1.useAppStore.getState().preferences.notifications).toEqual(originalNotifications);
        });
    });
    describe('reset', () => {
        it('resets all state to initial values', () => {
            appStore_1.useAppStore.getState().setUser({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test',
                role: 'admin',
                permissions: [],
                clearance: 'SECRET',
            });
            appStore_1.useAppStore.getState().setOfflineMode(true);
            appStore_1.useAppStore.getState().setError('Some error');
            appStore_1.useAppStore.getState().reset();
            expect(appStore_1.useAppStore.getState().user).toBeNull();
            expect(appStore_1.useAppStore.getState().isAuthenticated).toBe(false);
            expect(appStore_1.useAppStore.getState().offlineMode).toBe(false);
            expect(appStore_1.useAppStore.getState().error).toBeNull();
        });
    });
});
