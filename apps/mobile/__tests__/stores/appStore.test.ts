import { useAppStore } from '../../src/stores/appStore';

// Reset store between tests
beforeEach(() => {
  useAppStore.getState().reset();
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

      useAppStore.getState().setUser(user);

      expect(useAppStore.getState().user).toEqual(user);
      expect(useAppStore.getState().isAuthenticated).toBe(true);
    });

    it('clears user on null', () => {
      useAppStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'analyst',
        permissions: [],
        clearance: 'UNCLASSIFIED',
      });

      useAppStore.getState().setUser(null);

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('sync status', () => {
    it('updates sync status', () => {
      useAppStore.getState().setSyncStatus({
        isSyncing: true,
        pendingChanges: 5,
      });

      const status = useAppStore.getState().syncStatus;
      expect(status.isSyncing).toBe(true);
      expect(status.pendingChanges).toBe(5);
    });

    it('merges sync status updates', () => {
      useAppStore.getState().setSyncStatus({ pendingChanges: 10 });
      useAppStore.getState().setSyncStatus({ isSyncing: true });

      const status = useAppStore.getState().syncStatus;
      expect(status.pendingChanges).toBe(10);
      expect(status.isSyncing).toBe(true);
    });
  });

  describe('offline mode', () => {
    it('sets offline mode', () => {
      useAppStore.getState().setOfflineMode(true);

      expect(useAppStore.getState().offlineMode).toBe(true);
      expect(useAppStore.getState().syncStatus.offlineMode).toBe(true);
    });
  });

  describe('preferences', () => {
    it('updates preferences', () => {
      useAppStore.getState().updatePreferences({
        theme: 'light',
        mapStyle: 'satellite',
      });

      const prefs = useAppStore.getState().preferences;
      expect(prefs.theme).toBe('light');
      expect(prefs.mapStyle).toBe('satellite');
    });

    it('preserves other preferences when updating', () => {
      const originalNotifications = useAppStore.getState().preferences.notifications;

      useAppStore.getState().updatePreferences({ theme: 'light' });

      expect(useAppStore.getState().preferences.notifications).toEqual(
        originalNotifications
      );
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useAppStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'admin',
        permissions: [],
        clearance: 'SECRET',
      });
      useAppStore.getState().setOfflineMode(true);
      useAppStore.getState().setError('Some error');

      useAppStore.getState().reset();

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().isAuthenticated).toBe(false);
      expect(useAppStore.getState().offlineMode).toBe(false);
      expect(useAppStore.getState().error).toBeNull();
    });
  });
});
