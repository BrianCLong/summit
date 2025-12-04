import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  Gesture: {
    Pan: () => ({
      onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
    }),
  },
  GestureDetector: ({ children }) => children,
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  })),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(null),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// Mock react-native-biometrics
jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
    simplePrompt: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock @notifee/react-native
jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn().mockResolvedValue('notification-id'),
  createChannel: jest.fn().mockResolvedValue('channel-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
  getBadgeCount: jest.fn().mockResolvedValue(0),
  onBackgroundEvent: jest.fn(),
  requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
}));

// Mock @react-native-firebase/messaging
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onMessage: jest.fn().mockReturnValue(() => {}),
  onNotificationOpenedApp: jest.fn().mockReturnValue(() => {}),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onTokenRefresh: jest.fn().mockReturnValue(() => {}),
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
}));

// Mock @rnmapbox/maps
jest.mock('@rnmapbox/maps', () => ({
  setAccessToken: jest.fn(),
  MapView: 'MapView',
  Camera: 'Camera',
  UserLocation: 'UserLocation',
  ShapeSource: 'ShapeSource',
  CircleLayer: 'CircleLayer',
  SymbolLayer: 'SymbolLayer',
}));

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn().mockResolvedValue(0),
  finish: jest.fn(),
  status: jest.fn().mockResolvedValue(0),
  NETWORK_TYPE_ANY: 0,
}));

// Global fetch mock
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
});

// Silence console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') || args[0].includes('NativeEventEmitter'))
  ) {
    return;
  }
  originalWarn(...args);
};
