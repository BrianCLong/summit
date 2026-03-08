"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCases = useCases;
/**
 * Cases Hook
 * Provides case data with offline support
 */
const react_1 = require("react");
const offlineCache_1 = require("@/lib/offlineCache");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const AuthContext_1 = require("@/contexts/AuthContext");
function useCases() {
    const [cases, setCases] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const { isOnline } = (0, NetworkContext_1.useNetwork)();
    const { accessToken } = (0, AuthContext_1.useAuth)();
    // Load cases from cache
    const loadFromCache = (0, react_1.useCallback)(async () => {
        try {
            const cached = await offlineCache_1.offlineCache.cases.getAll();
            setCases(cached.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()));
        }
        catch (err) {
            console.error('Failed to load cases from cache:', err);
        }
    }, []);
    // Fetch cases from server
    const fetchFromServer = (0, react_1.useCallback)(async () => {
        if (!isOnline || !accessToken)
            return;
        try {
            const response = await fetch('/api/mobile/cases/assigned', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch cases');
            }
            const data = await response.json();
            await offlineCache_1.offlineCache.cases.setMany(data);
            setCases(data.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()));
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch cases');
            await loadFromCache();
        }
    }, [isOnline, accessToken, loadFromCache]);
    // Refresh cases
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
    // Get single case
    const getCase = (0, react_1.useCallback)(async (id) => {
        // Check cache first
        let caseData = await offlineCache_1.offlineCache.cases.get(id);
        // If online, fetch fresh data
        if (isOnline && accessToken) {
            try {
                const response = await fetch(`/api/mobile/cases/${id}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                if (response.ok) {
                    caseData = await response.json();
                    await offlineCache_1.offlineCache.cases.set(caseData);
                }
            }
            catch {
                // Use cached data
            }
        }
        return caseData;
    }, [isOnline, accessToken]);
    // Initial load
    (0, react_1.useEffect)(() => {
        refresh();
    }, [refresh]);
    return {
        cases,
        isLoading,
        error,
        refresh,
        getCase,
    };
}
