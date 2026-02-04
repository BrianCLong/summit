// client/src/hooks/useFeatureFlag.ts
import { useState, useEffect, useContext, createContext, useCallback } from 'react';

// Define types for feature flags
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  value?: unknown;
  variants?: Record<string, unknown>;
  lastUpdated?: Date;
}

export interface FeatureFlagContextType {
  flags: Record<string, FeatureFlag>;
  isLoading: boolean;
  error: Error | null;
  refreshFlags: () => Promise<void>;
  getFlag: (key: string) => FeatureFlag | null;
  getFlagValue: <T = unknown>(key: string, defaultValue?: T) => T | boolean | undefined;
}

// Create the context with default values
const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

// Provider component
interface FeatureFlagProviderProps {
  children: JSX.Element | JSX.Element[];
  apiUrl?: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const DEFAULT_API_URL = '/api/feature-flags';
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function FeatureFlagProvider({
  children,
  apiUrl = DEFAULT_API_URL,
  userId,
  autoRefresh = true,
  refreshInterval = DEFAULT_REFRESH_INTERVAL
}: FeatureFlagProviderProps): JSX.Element {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch flags from the server
  const fetchFlags = useCallback(async (): Promise<void> => {
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

      const data: FeatureFlag[] = await response.json();

      // Transform array to record for easier access
      const flagsRecord: Record<string, FeatureFlag> = {};
      data.forEach(flag => {
        flagsRecord[flag.key] = {
          ...flag,
          lastUpdated: new Date()
        };
      });

      setFlags(flagsRecord);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Unknown error');
      setError(fetchError);
      console.error('Error fetching feature flags:', fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, userId]);

  // Effect to fetch flags on mount
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Effect to set up auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchFlags, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, fetchFlags]);

  // Function to refresh flags manually
  const refreshFlags = async (): Promise<void> => {
    await fetchFlags();
  };

  // Function to get a specific flag
  const getFlag = (key: string): FeatureFlag | null => {
    return flags[key] || null;
  };

  // Function to get a specific flag's value with type safety
  const getFlagValue = <T = unknown>(key: string, defaultValue?: T): T | boolean | undefined => {
    const flag = getFlag(key);
    if (!flag) {
      return defaultValue;
    }

    // If the flag has variants, return the first variant's value
    if (flag.variants && Object.keys(flag.variants).length > 0) {
      const variantKeys = Object.keys(flag.variants);
      return flag.variants[variantKeys[0]] as T;
    }

    // Otherwise return the boolean enabled value or the specific value
    return (flag.value !== undefined ? flag.value : flag.enabled) as T | boolean;
  };

  const contextValue: FeatureFlagContextType = {
    flags,
    isLoading,
    error,
    refreshFlags,
    getFlag,
    getFlagValue
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// Hook to use the feature flag context
// eslint-disable-next-line react-refresh/only-export-components
export const useFeatureFlag = (flagKey: string): {
  enabled: boolean;
  value?: unknown;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} => {
  const context = useContext(FeatureFlagContext);

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

// Hook to get multiple flags
// eslint-disable-next-line react-refresh/only-export-components
export const useMultipleFeatureFlags = (flagKeys: string[]): {
  flags: Record<string, boolean>;
  values: Record<string, unknown>;
  isLoading: boolean;
  error: Error | null;
} => {
  const context = useContext(FeatureFlagContext);

  if (!context) {
    throw new Error('useMultipleFeatureFlags must be used within a FeatureFlagProvider');
  }

  const flags: Record<string, boolean> = {};
  const values: Record<string, unknown> = {};

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

// Hook to check if all flags are enabled
// eslint-disable-next-line react-refresh/only-export-components
export const useFeatureFlagAll = (flagKeys: string[]): {
  allEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
} => {
  const { flags, isLoading, error } = useMultipleFeatureFlags(flagKeys);

  // Check if all flags are enabled
  const allEnabled = flagKeys.every(key => flags[key]);

  return {
    allEnabled,
    isLoading,
    error
  };
};

// Hook to check if any flag is enabled
// eslint-disable-next-line react-refresh/only-export-components
export const useFeatureFlagAny = (flagKeys: string[]): {
  anyEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
} => {
  const { flags, isLoading, error } = useMultipleFeatureFlags(flagKeys);

  // Check if any flag is enabled
  const anyEnabled = flagKeys.some(key => flags[key]);

  return {
    anyEnabled,
    isLoading,
    error
  };
};

// Export the context for advanced use cases
export { FeatureFlagContext };