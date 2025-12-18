import AsyncStorage from '@react-native-async-storage/async-storage';
import {QueryClient} from '@tanstack/react-query';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import {persistQueryClient} from '@tanstack/react-query-persist-client';
import {performanceMonitor} from '../services/PerformanceMonitor';

const CACHE_TIME = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Create persisted query client for offline support
 */
export const createPersistedQueryClient = (): QueryClient => {
  const queryClient = new QueryClient({
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

/**
 * Setup query client persistence
 */
const setupPersistence = async (queryClient: QueryClient) => {
  performanceMonitor.mark('query_persistence_setup');

  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Throttle writes to reduce I/O
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data),
  });

  await persistQueryClient({
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

  const duration = performanceMonitor.measure('query_persistence_setup', 'startup');
  console.log(`[ReactQuery] Persistence setup in ${duration}ms`);
};

/**
 * Clear all persisted queries
 */
export const clearPersistedQueries = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));
    await AsyncStorage.multiRemove(queryKeys);
    console.log('[ReactQuery] Cleared all persisted queries');
  } catch (error) {
    console.error('[ReactQuery] Failed to clear persisted queries:', error);
  }
};

/**
 * Get persisted cache size
 */
export const getPersistedCacheSize = async (): Promise<number> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));

    let totalSize = 0;
    for (const key of queryKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[ReactQuery] Failed to get cache size:', error);
    return 0;
  }
};

/**
 * Prune old cached queries
 */
export const pruneOldQueries = async (maxAgeMs: number = MAX_AGE): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const queryKeys = keys.filter((key) => key.startsWith('REACT_QUERY_OFFLINE_CACHE'));

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const key of queryKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const data = JSON.parse(value);
        const timestamp = data.clientState?.queries?.[0]?.state?.dataUpdatedAt;

        if (timestamp && now - timestamp > maxAgeMs) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`[ReactQuery] Pruned ${keysToRemove.length} old queries`);
    }
  } catch (error) {
    console.error('[ReactQuery] Failed to prune old queries:', error);
  }
};

/**
 * Optimistic update helper
 */
export const createOptimisticUpdate = <TData, TVariables>(
  queryClient: QueryClient,
  queryKey: any[],
  updater: (old: TData | undefined, variables: TVariables) => TData,
) => {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey});

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) => updater(old, variables));

      return {previousData};
    },
    onError: (_err: any, _variables: TVariables, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({queryKey});
    },
  };
};
