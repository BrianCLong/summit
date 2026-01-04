// client/src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  downtime: number; // milliseconds
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

/**
 * Hook to monitor network connectivity status
 * Tracks online/offline transitions and downtime duration
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(Date.now());
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);
  const [downtime, setDowntime] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => {
      const now = Date.now();
      setIsOnline(true);
      setLastOnlineAt(now);

      // Calculate downtime if we were previously offline
      if (lastOfflineAt) {
        setDowntime(now - lastOfflineAt);
        setWasOffline(true);

        // Reset wasOffline flag after a delay to allow reconnect handling
        setTimeout(() => setWasOffline(false), 1000);
      }
    };

    const handleOffline = () => {
      const now = Date.now();
      setIsOnline(false);
      setLastOfflineAt(now);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check as fallback (some browsers don't fire events reliably)
    const checkInterval = setInterval(() => {
      const currentOnlineStatus = navigator.onLine;
      if (currentOnlineStatus !== isOnline) {
        if (currentOnlineStatus) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, [isOnline, lastOfflineAt]);

  return {
    isOnline,
    wasOffline,
    downtime,
    lastOnlineAt,
    lastOfflineAt,
  };
}
