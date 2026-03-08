"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAlerts = useAlerts;
/**
 * Alerts Hook
 * Provides alert data with offline support
 */
const react_1 = require("react");
const offlineCache_1 = require("@/lib/offlineCache");
const syncEngine_1 = require("@/lib/syncEngine");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const AuthContext_1 = require("@/contexts/AuthContext");
function useAlerts() {
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const { isOnline } = (0, NetworkContext_1.useNetwork)();
    const { accessToken } = (0, AuthContext_1.useAuth)();
    // Load alerts from cache
    const loadFromCache = (0, react_1.useCallback)(async () => {
        try {
            const cached = await offlineCache_1.offlineCache.alerts.getAll();
            setAlerts(cached.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
        catch (err) {
            console.error('Failed to load alerts from cache:', err);
        }
    }, []);
    // Fetch alerts from server
    const fetchFromServer = (0, react_1.useCallback)(async () => {
        if (!isOnline || !accessToken)
            return;
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
            await offlineCache_1.offlineCache.alerts.setMany(data);
            setAlerts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
            // Fall back to cache
            await loadFromCache();
        }
    }, [isOnline, accessToken, loadFromCache]);
    // Refresh alerts
    const refresh = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        try {
            if (isOnline) {
                await fetchFromServer();
            }
            else {
                await loadFromCache();
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [isOnline, fetchFromServer, loadFromCache]);
    // Mark alert as read
    const markAsRead = (0, react_1.useCallback)(async (id) => {
        // Optimistic update
        setAlerts((prev) => prev.map((alert) => alert.id === id ? { ...alert, isRead: true } : alert));
        // Update cache
        await offlineCache_1.offlineCache.alerts.markAsRead(id);
        // Queue for sync
        await syncEngine_1.syncEngine.queueForSync('update', 'acknowledgement', {
            alertId: id,
            type: 'read',
            timestamp: new Date().toISOString(),
        });
    }, []);
    // Acknowledge alert
    const acknowledge = (0, react_1.useCallback)(async (id) => {
        const now = new Date().toISOString();
        // Optimistic update
        setAlerts((prev) => prev.map((alert) => alert.id === id
            ? { ...alert, isRead: true, acknowledgedAt: now }
            : alert));
        // Update cache
        await offlineCache_1.offlineCache.alerts.markAsRead(id);
        // Queue for sync
        await syncEngine_1.syncEngine.queueForSync('update', 'acknowledgement', {
            alertId: id,
            type: 'acknowledged',
            timestamp: now,
        });
    }, []);
    // Initial load
    (0, react_1.useEffect)(() => {
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
