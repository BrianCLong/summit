"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagContext = exports.useFeatureFlagAny = exports.useFeatureFlagAll = exports.useMultipleFeatureFlags = exports.useFeatureFlag = void 0;
exports.FeatureFlagProvider = FeatureFlagProvider;
// client/src/hooks/useFeatureFlag.ts
const react_1 = require("react");
// Create the context with default values
const FeatureFlagContext = (0, react_1.createContext)(undefined);
exports.FeatureFlagContext = FeatureFlagContext;
const DEFAULT_API_URL = '/api/feature-flags';
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
function FeatureFlagProvider({ children, apiUrl = DEFAULT_API_URL, userId, autoRefresh = true, refreshInterval = DEFAULT_REFRESH_INTERVAL }) {
    const [flags, setFlags] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Fetch flags from the server
    const fetchFlags = (0, react_1.useCallback)(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const queryParams = new URLSearchParams();
            if (userId) {
                queryParams.append('userId', userId);
            }
            const response = await fetch(`${apiUrl}?${queryParams.toString()}`, {
                headers: {
                    'Content-Type': 'application/json',
                    // Add any auth headers if needed
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Transform array to record for easier access
            const flagsRecord = {};
            data.forEach(flag => {
                flagsRecord[flag.key] = {
                    ...flag,
                    lastUpdated: new Date()
                };
            });
            setFlags(flagsRecord);
        }
        catch (err) {
            const fetchError = err instanceof Error ? err : new Error('Unknown error');
            setError(fetchError);
            console.error('Error fetching feature flags:', fetchError);
        }
        finally {
            setIsLoading(false);
        }
    }, [apiUrl, userId]);
    // Effect to fetch flags on mount
    (0, react_1.useEffect)(() => {
        fetchFlags();
    }, [fetchFlags]);
    // Effect to set up auto-refresh if enabled
    (0, react_1.useEffect)(() => {
        if (!autoRefresh)
            return;
        const intervalId = setInterval(fetchFlags, refreshInterval);
        return () => {
            clearInterval(intervalId);
        };
    }, [autoRefresh, refreshInterval, fetchFlags]);
    // Function to refresh flags manually
    const refreshFlags = async () => {
        await fetchFlags();
    };
    // Function to get a specific flag
    const getFlag = (key) => {
        return flags[key] || null;
    };
    // Function to get a specific flag's value with type safety
    const getFlagValue = (key, defaultValue) => {
        const flag = getFlag(key);
        if (!flag) {
            return defaultValue;
        }
        // If the flag has variants, return the first variant's value
        if (flag.variants && Object.keys(flag.variants).length > 0) {
            const variantKeys = Object.keys(flag.variants);
            return flag.variants[variantKeys[0]];
        }
        // Otherwise return the boolean enabled value or the specific value
        return (flag.value !== undefined ? flag.value : flag.enabled);
    };
    const contextValue = {
        flags,
        isLoading,
        error,
        refreshFlags,
        getFlag,
        getFlagValue
    };
    return (<FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>);
}
// Hook to use the feature flag context
// eslint-disable-next-line react-refresh/only-export-components
const useFeatureFlag = (flagKey) => {
    const context = (0, react_1.useContext)(FeatureFlagContext);
    if (!context) {
        throw new Error('useFeatureFlag must be used within a FeatureFlagProvider');
    }
    const flag = context.getFlag(flagKey);
    return {
        enabled: flag ? (flag.value !== undefined ? !!flag.value : flag.enabled) : false,
        value: flag ? (flag.value !== undefined ? flag.value : flag.enabled) : undefined,
        isLoading: context.isLoading,
        error: context.error,
        refresh: context.refreshFlags
    };
};
exports.useFeatureFlag = useFeatureFlag;
// Hook to get multiple flags
// eslint-disable-next-line react-refresh/only-export-components
const useMultipleFeatureFlags = (flagKeys) => {
    const context = (0, react_1.useContext)(FeatureFlagContext);
    if (!context) {
        throw new Error('useMultipleFeatureFlags must be used within a FeatureFlagProvider');
    }
    const flags = {};
    const values = {};
    flagKeys.forEach(key => {
        const flag = context.getFlag(key);
        flags[key] = flag ? (flag.value !== undefined ? !!flag.value : flag.enabled) : false;
        values[key] = flag ? (flag.value !== undefined ? flag.value : flag.enabled) : undefined;
    });
    return {
        flags,
        values,
        isLoading: context.isLoading,
        error: context.error
    };
};
exports.useMultipleFeatureFlags = useMultipleFeatureFlags;
// Hook to check if all flags are enabled
// eslint-disable-next-line react-refresh/only-export-components
const useFeatureFlagAll = (flagKeys) => {
    const { flags, isLoading, error } = (0, exports.useMultipleFeatureFlags)(flagKeys);
    // Check if all flags are enabled
    const allEnabled = flagKeys.every(key => flags[key]);
    return {
        allEnabled,
        isLoading,
        error
    };
};
exports.useFeatureFlagAll = useFeatureFlagAll;
// Hook to check if any flag is enabled
// eslint-disable-next-line react-refresh/only-export-components
const useFeatureFlagAny = (flagKeys) => {
    const { flags, isLoading, error } = (0, exports.useMultipleFeatureFlags)(flagKeys);
    // Check if any flag is enabled
    const anyEnabled = flagKeys.some(key => flags[key]);
    return {
        anyEnabled,
        isLoading,
        error
    };
};
exports.useFeatureFlagAny = useFeatureFlagAny;
