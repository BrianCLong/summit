import {useEffect, useState} from 'react';
import {Keyboard, KeyboardEvent} from 'react-native';

export interface KeyboardInfo {
  isVisible: boolean;
  height: number;
}

/**
 * Hook for monitoring keyboard visibility and height
 */
export const useKeyboard = (): KeyboardInfo => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: true,
        height: e.endCoordinates.height,
      });
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardInfo;
};
