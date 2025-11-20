import {useEffect, useState} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isOnline: boolean;
}

/**
 * Hook for monitoring network connectivity status
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    isOnline: true,
  });

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      updateNetworkStatus(state);
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      updateNetworkStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkStatus = (state: NetInfoState) => {
    const isOnline = state.isConnected === true && state.isInternetReachable === true;

    setNetworkStatus({
      isConnected: state.isConnected === true,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isOnline,
    });
  };

  return networkStatus;
};
