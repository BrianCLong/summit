"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOptimisticUpdate = exports.pruneOldQueries = exports.getPersistedCacheSize = exports.clearPersistedQueries = exports.createPersistedQueryClient = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const react_query_1 = require("@tanstack/react-query");
const query_async_storage_persister_1 = require("@tanstack/query-async-storage-persister");
const react_query_persist_client_1 = require("@tanstack/react-query-persist-client");
const PerformanceMonitor_1 = require("../services/PerformanceMonitor");
const CACHE_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
/**
 * Create persisted query client for offline support
 */
const createPersistedQueryClient = () => {
    const queryClient = new react_query_1.QueryClient({
        defaultOptions: {
            queries: {
                // Optimize for offline-first
                staleTime: 5 * 60 * 1000, // 5 minutes
                gcTime: CACHE_TIME, // 7 days
                retry: 2,
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                networkMode: 'offlineFirst',
                // Provide cached data immediately while fetching fresh data
                placeholderData: (previousData) => previousData,
            },
            mutations: {
                networkMode: 'offlineFirst',
                retry: 3,
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            },
        },
    });
    // Setup persistence
    setupPersistence(queryClient);
    return queryClient;
};
exports.createPersistedQueryClient = createPersistedQueryClient;
/**
 * Setup query client persistence
 */
const setupPersistence = async (queryClient) => {
    PerformanceMonitor_1.performanceMonitor.mark('query_persistence_setup');
    const persister = (0, query_async_storage_persister_1.createAsyncStoragePersister)({
        storage: async_storage_1.default,
        throttleTime: 1000, // Throttle writes to reduce I/O
        serialize: (data) => JSON.stringify(data),
        deserialize: (data) => JSON.parse(data),
    });
    await (0, react_query_persist_client_1.persistQueryClient)({
        queryClient,
        persister,
        maxAge: MAX_AGE,
        buster: '', // Change this to invalidate all cached data
        hydrateOptions: {
            // Don't refetch on hydration for faster startup
            defaultOptions: {
                queries: {
                    refetchOnMount: false,
                },
            },
        },
        dehydrateOptions: {
            // Only persist successful queries
            shouldDehydrateQuery: (query) => {
                return query.state.status === 'success';
            },
        },
    });
    const duration = PerformanceMonitor_1.performanceMonitor.measure('query_persistence_setup', 'startup');
    console.log(`[ReactQuery] Persistence setup in ${duration}ms`);
};
/**
 * Clear all persisted queries
 */
const clearPersistedQueries = async () => {
    try {
        const keys = await async_storage_1.default.getAllKeys();
        const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));
        await async_storage_1.default.multiRemove(queryKeys);
        console.log('[ReactQuery] Cleared all persisted queries');
    }
    catch (error) {
        console.error('[ReactQuery] Failed to clear persisted queries:', error);
    }
};
exports.clearPersistedQueries = clearPersistedQueries;
/**
 * Get persisted cache size
 */
const getPersistedCacheSize = async () => {
    try {
        const keys = await async_storage_1.default.getAllKeys();
        const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));
        let totalSize = 0;
        for (const key of queryKeys) {
            const value = await async_storage_1.default.getItem(key);
            if (value) {
                totalSize += new Blob([value]).size;
            }
        }
        return totalSize;
    }
    catch (error) {
        console.error('[ReactQuery] Failed to get cache size:', error);
        return 0;
    }
};
exports.getPersistedCacheSize = getPersistedCacheSize;
/**
 * Prune old cached queries
 */
const pruneOldQueries = async (maxAgeMs = MAX_AGE) => {
    try {
        const keys = await async_storage_1.default.getAllKeys();
        const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));
        const now = Date.now();
        const keysToRemove = [];
        for (const key of queryKeys) {
            const value = await async_storage_1.default.getItem(key);
            if (value) {
                const data = JSON.parse(value);
                const timestamp = data.clientState?.queries?.[0]?.state?.dataUpdatedAt;
                if (timestamp && now - timestamp > maxAgeMs) {
                    keysToRemove.push(key);
                }
            }
        }
        if (keysToRemove.length > 0) {
            await async_storage_1.default.multiRemove(keysToRemove);
            console.log(`[ReactQuery] Pruned ${keysToRemove.length} old queries`);
        }
    }
    catch (error) {
        console.error('[ReactQuery] Failed to prune old queries:', error);
    }
};
exports.pruneOldQueries = pruneOldQueries;
/**
 * Optimistic update helper
 */
const createOptimisticUpdate = (queryClient, queryKey, updater) => {
    return {
        onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey });
            // Snapshot previous value
            const previousData = queryClient.getQueryData(queryKey);
            // Optimistically update
            queryClient.setQueryData(queryKey, (old) => updater(old, variables));
            return { previousData };
        },
        onError: (_err, _variables, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
        },
        onSettled: () => {
            // Refetch after mutation
            queryClient.invalidateQueries({ queryKey });
        },
    };
};
exports.createOptimisticUpdate = createOptimisticUpdate;
