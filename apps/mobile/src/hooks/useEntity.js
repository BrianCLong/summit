"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEntity = useEntity;
/**
 * Entities Hook
 * Provides entity data with offline support
 */
const react_1 = require("react");
const offlineCache_1 = require("@/lib/offlineCache");
const NetworkContext_1 = require("@/contexts/NetworkContext");
const AuthContext_1 = require("@/contexts/AuthContext");
function useEntity(initialId) {
    const [entity, setEntity] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const { isOnline } = (0, NetworkContext_1.useNetwork)();
    const { accessToken } = (0, AuthContext_1.useAuth)();
    const fetchEntity = (0, react_1.useCallback)(async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            // Check cache first
            let entityData = await offlineCache_1.offlineCache.entities.get(id);
            // If online, try to fetch fresh data
            if (isOnline && accessToken) {
                try {
                    const response = await fetch(`/api/mobile/entities/${id}`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                    if (response.ok) {
                        entityData = await response.json();
                        await offlineCache_1.offlineCache.entities.set(entityData);
                    }
                }
                catch {
                    // Use cached data if fetch fails
                }
            }
            if (entityData) {
                setEntity(entityData);
            }
            else {
                setError('Entity not found');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch entity');
        }
        finally {
            setIsLoading(false);
        }
    }, [isOnline, accessToken]);
    // Fetch initial entity if provided
    if (initialId && !entity && !isLoading) {
        fetchEntity(initialId);
    }
    return {
        entity,
        isLoading,
        error,
        fetchEntity,
    };
}
