import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {getCurrentLocation, watchLocation, clearLocationWatch, Location} from '../services/LocationService';

interface LocationContextType {
  location: Location | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export const LocationContext = createContext<LocationContextType>({
  location: null,
  isTracking: false,
  startTracking: () => {},
  stopTracking: () => {},
});

export const LocationProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        clearLocationWatch(watchId);
      }
    };
  }, [watchId]);

  const startTracking = () => {
    if (isTracking) return;

    const id = watchLocation((loc) => {
      setLocation(loc);
    });

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      clearLocationWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  return (
    <LocationContext.Provider value={{location, isTracking, startTracking, stopTracking}}>
      {children}
    </LocationContext.Provider>
  );
};
