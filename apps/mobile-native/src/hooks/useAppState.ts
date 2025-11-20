import {useEffect, useState, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';

/**
 * Hook for monitoring app state (active, background, inactive)
 */
export const useAppState = (
  onChange?: (status: AppStateStatus) => void
): {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
} => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const appStateRef = useRef(appState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
      setAppState(nextAppState);

      if (onChange) {
        onChange(nextAppState);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onChange]);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
  };
};
