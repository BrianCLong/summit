import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** Whether we were previously offline (useful for triggering refresh) */
  wasOffline: boolean;
  /** Timestamp of last status change */
  lastChanged: number | null;
}

/**
 * Hook that tracks network connectivity status.
 * Uses the Navigator.onLine API and online/offline events.
 *
 * @returns NetworkStatus object with current connectivity state
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastChanged, setLastChanged] = useState<number | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastChanged(Date.now());
    // wasOffline remains true until consumer acknowledges
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setLastChanged(Date.now());
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Reset wasOffline when online status is acknowledged
  useEffect(() => {
    if (isOnline && wasOffline) {
      // Give consumers time to react to wasOffline before clearing
      const timeout = setTimeout(() => {
        setWasOffline(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, wasOffline]);

  return { isOnline, wasOffline, lastChanged };
}
