import React, {createContext, useState, useEffect, ReactNode} from 'react';
import NetInfo from '@react-native-community/netinfo';

interface OfflineContextType {
  isOnline: boolean;
  isConnected: boolean;
}

export const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isConnected: true,
});

export const OfflineProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected || false);
      setIsOnline((state.isConnected && state.isInternetReachable) || false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <OfflineContext.Provider value={{isOnline, isConnected}}>
      {children}
    </OfflineContext.Provider>
  );
};
