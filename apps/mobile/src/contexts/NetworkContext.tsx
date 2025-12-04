/**
 * Network Context
 * Provides network status awareness across the app
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { NetworkStatus } from '@/types';
import { syncEngine } from '@/lib/syncEngine';

interface NetworkContextType {
  status: NetworkStatus;
  isOnline: boolean;
  isSlow: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Extended Navigator type for Network Information API
interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [effectiveType, setEffectiveType] = useState<string | null>(null);
  const [downlink, setDownlink] = useState<number | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);

  // Get network connection object
  const getConnection = (): NetworkInformation | undefined => {
    const nav = navigator as NavigatorWithConnection;
    return nav.connection || nav.mozConnection || nav.webkitConnection;
  };

  // Update network info
  const updateNetworkInfo = useCallback(() => {
    const connection = getConnection();

    if (connection) {
      setEffectiveType(connection.effectiveType);
      setDownlink(connection.downlink);
      setRtt(connection.rtt);

      // Determine if connection is slow
      const isSlow =
        connection.effectiveType === '2g' ||
        connection.effectiveType === 'slow-2g' ||
        connection.rtt > 500 ||
        connection.downlink < 0.5;

      if (!navigator.onLine) {
        setStatus('offline');
      } else if (isSlow) {
        setStatus('slow');
      } else {
        setStatus('online');
      }
    } else {
      setStatus(navigator.onLine ? 'online' : 'offline');
    }
  }, []);

  // Check actual connection by making a request
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial update
    updateNetworkInfo();

    // Online/offline events
    const handleOnline = () => {
      updateNetworkInfo();
      syncEngine.syncAll(); // Trigger sync when coming online
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API events
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  const value: NetworkContextType = {
    status,
    isOnline: status !== 'offline',
    isSlow: status === 'slow',
    effectiveType,
    downlink,
    rtt,
    checkConnection,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
