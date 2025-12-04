/**
 * Alerts Hook
 * Provides alert data with offline support
 */
import { useState, useEffect, useCallback } from 'react';
import type { Alert } from '@/types';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseAlertsResult {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetwork();
  const { accessToken } = useAuth();

  // Load alerts from cache
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await offlineCache.alerts.getAll();
      setAlerts(cached.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error('Failed to load alerts from cache:', err);
    }
  }, []);

  // Fetch alerts from server
  const fetchFromServer = useCallback(async () => {
    if (!isOnline || !accessToken) return;

    try {
      const response = await fetch('/api/mobile/alerts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      await offlineCache.alerts.setMany(data);
      setAlerts(data.sort((a: Alert, b: Alert) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      // Fall back to cache
      await loadFromCache();
    }
  }, [isOnline, accessToken, loadFromCache]);

  // Refresh alerts
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        await fetchFromServer();
      } else {
        await loadFromCache();
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetchFromServer, loadFromCache]);

  // Mark alert as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, isRead: true } : alert
      )
    );

    // Update cache
    await offlineCache.alerts.markAsRead(id);

    // Queue for sync
    await syncEngine.queueForSync('update', 'acknowledgement', {
      alertId: id,
      type: 'read',
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Acknowledge alert
  const acknowledge = useCallback(async (id: string) => {
    const now = new Date().toISOString();

    // Optimistic update
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id
          ? { ...alert, isRead: true, acknowledgedAt: now }
          : alert
      )
    );

    // Update cache
    await offlineCache.alerts.markAsRead(id);

    // Queue for sync
    await syncEngine.queueForSync('update', 'acknowledgement', {
      alertId: id,
      type: 'acknowledged',
      timestamp: now,
    });
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Unread count
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    acknowledge,
  };
}
