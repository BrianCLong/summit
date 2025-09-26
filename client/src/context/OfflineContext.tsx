import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  flushQueuedMutations,
  getPendingMutationCount,
} from '../services/offline/mutations';
import { registerOfflineServiceWorker } from '../services/offline/registerServiceWorker';

export type OfflineContextValue = {
  isOffline: boolean;
  lastSync: number | null;
  pendingMutations: number;
  flushPending: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pendingMutations, setPendingMutations] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    let messageHandler: ((event: MessageEvent) => void) | null = null;

    const updatePending = async () => {
      const count = await getPendingMutationCount();
      if (isMounted) setPendingMutations(count);
    };

    registerOfflineServiceWorker().then((registration) => {
      if (!registration || !isMounted) return;

      messageHandler = (event: MessageEvent) => {
        const { type } = (event.data ?? {}) as { type?: string };
        if (type === 'OFFLINE_MUTATION_QUEUED' || type === 'OFFLINE_MUTATION_FLUSHED') {
          void updatePending();
        }
        if (type === 'OFFLINE_DATA_SYNCED' && isMounted) {
          setLastSync(Date.now());
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);

      void updatePending();
    });

    const handleOnline = async () => {
      setIsOffline(false);
      const result = await flushQueuedMutations();
      setPendingMutations(result.remaining);
      setLastSync(Date.now());
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void handleOnline();
    } else {
      setIsOffline(true);
      void updatePending();
    }

    return () => {
      isMounted = false;
      if (messageHandler) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushPending = async () => {
    const result = await flushQueuedMutations();
    setPendingMutations(result.remaining);
    if (result.processed > 0) {
      setLastSync(Date.now());
    }
  };

  const value = useMemo(
    () => ({ isOffline, lastSync, pendingMutations, flushPending }),
    [isOffline, lastSync, pendingMutations],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
