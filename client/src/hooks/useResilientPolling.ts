import { useEffect, useRef, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export interface ResilientPollingOptions {
  /** Polling interval in milliseconds */
  interval: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Whether to trigger an immediate refresh when coming back online */
  refreshOnReconnect?: boolean;
  /** Whether to prevent multiple simultaneous polling requests */
  preventConcurrent?: boolean;
}

/**
 * Hook that provides resilient polling with network-aware features:
 * - Automatically pauses polling when offline
 * - Optionally triggers refresh when reconnecting
 * - Prevents concurrent requests when configured
 * - Cleans up intervals properly
 *
 * @param pollingFn - The async function to call on each poll
 * @param options - Configuration options
 */
export function useResilientPolling(
  pollingFn: () => Promise<void>,
  options: ResilientPollingOptions
) {
  const {
    interval,
    enabled = true,
    refreshOnReconnect = true,
    preventConcurrent = true,
  } = options;
  const { isOnline, wasOffline } = useNetworkStatus();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);
  const pollingFnRef = useRef(pollingFn);

  // Keep pollingFn ref updated
  useEffect(() => {
    pollingFnRef.current = pollingFn;
  }, [pollingFn]);

  const executePoll = useCallback(async () => {
    // Skip if concurrent prevention is enabled and already polling
    if (preventConcurrent && isPollingRef.current) {
      return;
    }

    // Skip if offline
    if (!isOnline) {
      return;
    }

    isPollingRef.current = true;
    try {
      await pollingFnRef.current();
    } catch (error) {
      console.error('Polling error:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [isOnline, preventConcurrent]);

  // Handle reconnect refresh
  useEffect(() => {
    if (refreshOnReconnect && wasOffline && isOnline && enabled) {
      executePoll();
    }
  }, [wasOffline, isOnline, refreshOnReconnect, enabled, executePoll]);

  // Set up polling interval
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't set up polling if disabled or offline
    if (!enabled || !isOnline) {
      return;
    }

    // Set up new interval
    intervalRef.current = setInterval(executePoll, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled, isOnline, executePoll]);

  return {
    isPolling: isPollingRef.current,
    isOnline,
    triggerPoll: executePoll,
  };
}
