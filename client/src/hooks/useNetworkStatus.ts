import { useEffect, useState } from 'react';

export interface NetworkStatus {
  isOffline: boolean;
  isOnline: boolean;
  lastChangedAt: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return !navigator.onLine;
  });
  const [lastChangedAt, setLastChangedAt] = useState(() => Date.now());

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setLastChangedAt(Date.now());
    };
    const handleOnline = () => {
      setIsOffline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    lastChangedAt,
  };
}
