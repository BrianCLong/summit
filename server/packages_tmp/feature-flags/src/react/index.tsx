/**
 * React Integration
 *
 * React hooks and components for feature flags
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type { FlagContext, FlagVariation } from '../types.js';

/**
 * Feature flag client interface (for browser)
 */
export interface FeatureFlagClient {
  /** Get boolean flag */
  getBooleanFlag(key: string, defaultValue: boolean): boolean;

  /** Get string flag */
  getStringFlag(key: string, defaultValue: string): string;

  /** Get number flag */
  getNumberFlag(key: string, defaultValue: number): number;

  /** Get JSON flag */
  getJSONFlag<T = any>(key: string, defaultValue: T): T;

  /** Get all flags */
  getAllFlags(): Record<string, FlagVariation>;

  /** Track event */
  track(eventName: string, data?: Record<string, any>): void;

  /** Update context */
  updateContext(context: Partial<FlagContext>): void;

  /** Subscribe to flag changes */
  subscribe(callback: (flags: Record<string, FlagVariation>) => void): () => void;
}

/**
 * Feature flag context type
 */
interface FeatureFlagContextType {
  /** Client instance */
  client: FeatureFlagClient | null;

  /** All flags */
  flags: Record<string, FlagVariation>;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Flag context */
  context: FlagContext;

  /** Update context */
  updateContext: (context: Partial<FlagContext>) => void;
}

/**
 * Feature flag context
 */
const FeatureFlagContext = createContext<FeatureFlagContextType>({
  client: null,
  flags: {},
  isLoading: true,
  error: null,
  context: {},
  updateContext: () => {},
});

/**
 * Feature flag provider props
 */
export interface FeatureFlagProviderProps {
  /** Client instance or fetch function */
  client?: FeatureFlagClient;

  /** API endpoint to fetch flags from */
  apiEndpoint?: string;

  /** Initial context */
  initialContext?: Partial<FlagContext>;

  /** Bootstrap flags (for SSR or offline) */
  bootstrapFlags?: Record<string, FlagVariation>;

  /** Polling interval in ms (0 to disable) */
  pollingInterval?: number;

  /** Children */
  children: ReactNode;
}

/**
 * Feature flag provider
 */
export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({
  client,
  apiEndpoint,
  initialContext = {},
  bootstrapFlags = {},
  pollingInterval = 0,
  children,
}) => {
  const [flags, setFlags] = useState<Record<string, FlagVariation>>(bootstrapFlags);
  const [isLoading, setIsLoading] = useState(!bootstrapFlags || Object.keys(bootstrapFlags).length === 0);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<FlagContext>(initialContext as FlagContext);
  const [clientInstance, setClientInstance] = useState<FeatureFlagClient | null>(client || null);

  // Fetch flags from API
  const fetchFlags = useCallback(async () => {
    if (!apiEndpoint && !client) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (client) {
        const allFlags = client.getAllFlags();
        setFlags(allFlags);
      } else if (apiEndpoint) {
        const response = await fetch(apiEndpoint, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feature flags: ${response.statusText}`);
        }

        const data = await response.json();
        setFlags(data.flags || {});

        // Update context from server if provided
        if (data.context) {
          setContext((prev) => ({ ...prev, ...data.context }));
        }
      }
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching feature flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, client]);

  // Initial fetch
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Polling
  useEffect(() => {
    if (pollingInterval > 0) {
      const interval = setInterval(fetchFlags, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchFlags, pollingInterval]);

  // Subscribe to client changes if provided
  useEffect(() => {
    if (client) {
      const unsubscribe = client.subscribe((updatedFlags) => {
        setFlags(updatedFlags);
      });
      return unsubscribe;
    }
  }, [client]);

  // Update context
  const updateContext = useCallback(
    (newContext: Partial<FlagContext>) => {
      setContext((prev) => ({ ...prev, ...newContext }));

      if (client) {
        client.updateContext(newContext);
      }

      // Re-fetch flags with new context
      fetchFlags();
    },
    [client, fetchFlags],
  );

  const value = useMemo(
    () => ({
      client: clientInstance,
      flags,
      isLoading,
      error,
      context,
      updateContext,
    }),
    [clientInstance, flags, isLoading, error, context, updateContext],
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * Hook to access feature flags
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);

  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }

  return context;
}

/**
 * Hook to check if a boolean flag is enabled
 */
export function useFeatureFlag(
  key: string,
  defaultValue: boolean = false,
): boolean {
  const { flags, client } = useFeatureFlags();

  if (client) {
    return client.getBooleanFlag(key, defaultValue);
  }

  const value = flags[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return Boolean(value);
}

/**
 * Hook to get a string flag value
 */
export function useStringFlag(
  key: string,
  defaultValue: string = '',
): string {
  const { flags, client } = useFeatureFlags();

  if (client) {
    return client.getStringFlag(key, defaultValue);
  }

  const value = flags[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return String(value);
}

/**
 * Hook to get a number flag value
 */
export function useNumberFlag(
  key: string,
  defaultValue: number = 0,
): number {
  const { flags, client } = useFeatureFlags();

  if (client) {
    return client.getNumberFlag(key, defaultValue);
  }

  const value = flags[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return Number(value);
}

/**
 * Hook to get a JSON flag value
 */
export function useJSONFlag<T = any>(
  key: string,
  defaultValue: T,
): T {
  const { flags, client } = useFeatureFlags();

  if (client) {
    return client.getJSONFlag<T>(key, defaultValue);
  }

  const value = flags[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }

  return value as T;
}

/**
 * Hook to track events
 */
export function useFeatureFlagTracker() {
  const { client } = useFeatureFlags();

  return useCallback(
    (eventName: string, data?: Record<string, any>) => {
      if (client) {
        client.track(eventName, data);
      }
    },
    [client],
  );
}

/**
 * Component to conditionally render based on feature flag
 */
export interface FeatureFlagProps {
  /** Flag key */
  flag: string;

  /** Default value */
  defaultValue?: boolean;

  /** Content to render when flag is enabled */
  children: ReactNode;

  /** Content to render when flag is disabled */
  fallback?: ReactNode;
}

/**
 * Feature flag component
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  flag,
  defaultValue = false,
  children,
  fallback = null,
}) => {
  const isEnabled = useFeatureFlag(flag, defaultValue);

  return <>{isEnabled ? children : fallback}</>;
};

/**
 * Component to render different content based on flag variation
 */
export interface FeatureVariationProps {
  /** Flag key */
  flag: string;

  /** Default variation */
  defaultVariation: string;

  /** Variations to render */
  variations: Record<string, ReactNode>;

  /** Fallback content */
  fallback?: ReactNode;
}

/**
 * Feature variation component
 */
export const FeatureVariation: React.FC<FeatureVariationProps> = ({
  flag,
  defaultVariation,
  variations,
  fallback = null,
}) => {
  const variation = useStringFlag(flag, defaultVariation);
  const content = variations[variation];

  return <>{content ?? fallback}</>;
};

/**
 * Simple in-memory feature flag client
 */
export class SimpleFeatureFlagClient implements FeatureFlagClient {
  private flags: Record<string, FlagVariation>;
  private context: FlagContext;
  private subscribers: Set<(flags: Record<string, FlagVariation>) => void>;

  constructor(
    initialFlags: Record<string, FlagVariation> = {},
    initialContext: FlagContext = {},
  ) {
    this.flags = initialFlags;
    this.context = initialContext;
    this.subscribers = new Set();
  }

  getBooleanFlag(key: string, defaultValue: boolean): boolean {
    const value = this.flags[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return Boolean(value);
  }

  getStringFlag(key: string, defaultValue: string): string {
    const value = this.flags[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return String(value);
  }

  getNumberFlag(key: string, defaultValue: number): number {
    const value = this.flags[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return Number(value);
  }

  getJSONFlag<T = any>(key: string, defaultValue: T): T {
    const value = this.flags[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value as T;
  }

  getAllFlags(): Record<string, FlagVariation> {
    return { ...this.flags };
  }

  track(eventName: string, data?: Record<string, any>): void {
    // Simple implementation - just log
    console.debug('Feature flag event:', eventName, data);
  }

  updateContext(context: Partial<FlagContext>): void {
    this.context = { ...this.context, ...context };
  }

  updateFlags(flags: Record<string, FlagVariation>): void {
    this.flags = { ...this.flags, ...flags };
    this.notifySubscribers();
  }

  subscribe(callback: (flags: Record<string, FlagVariation>) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const flags = this.getAllFlags();
    this.subscribers.forEach((callback) => callback(flags));
  }
}
