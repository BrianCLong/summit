import Config from 'react-native-dotenv';

// Environment configuration
export const ENV = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
} as const;

// API Configuration
export const API_CONFIG = {
  baseUrl: Config.API_URL || 'https://api.intelgraph.io',
  graphqlUrl: Config.GRAPHQL_URL || 'https://api.intelgraph.io/graphql',
  wsUrl: Config.WS_URL || 'wss://api.intelgraph.io/graphql',
  timeout: 30000,
} as const;

// Auth Configuration
export const AUTH_CONFIG = {
  tokenKey: '@intelgraph/auth_token',
  refreshTokenKey: '@intelgraph/refresh_token',
  userKey: '@intelgraph/user',
  biometricKey: '@intelgraph/biometric_enabled',
  pinKey: '@intelgraph/pin_hash',
  tokenRefreshBuffer: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

// Offline/Sync Configuration
export const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 50,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  maxOfflineAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  conflictResolution: 'server-wins' as const,
} as const;

// Database Configuration
export const DB_CONFIG = {
  name: 'intelgraph_mobile',
  version: 1,
  maxSize: 50 * 1024 * 1024, // 50MB
} as const;

// Map Configuration
export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 38.8977,
    longitude: -77.0365,
  },
  defaultZoom: 10,
  clusterRadius: 50,
  maxClusterZoom: 14,
  mapboxAccessToken: Config.MAPBOX_ACCESS_TOKEN || '',
  styles: {
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11',
  },
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  channelId: 'intelgraph-alerts',
  channelName: 'IntelGraph Alerts',
  androidSmallIcon: 'ic_notification',
  firebaseVapidKey: Config.FIREBASE_VAPID_KEY || '',
} as const;

// Feature Flags
export const FEATURES = {
  enableOfflineMode: true,
  enableBiometrics: true,
  enablePushNotifications: true,
  enableBackgroundSync: true,
  enableGEOINT: true,
  enableRealTimeUpdates: true,
  enableAnalytics: !__DEV__,
  enableCrashReporting: !__DEV__,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  maxAge: {
    entities: 15 * 60 * 1000, // 15 minutes
    investigations: 5 * 60 * 1000, // 5 minutes
    alerts: 1 * 60 * 1000, // 1 minute
    user: 60 * 60 * 1000, // 1 hour
  },
  staleWhileRevalidate: true,
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  maxListItems: 100,
  pageSize: 20,
  imageQuality: 0.8,
  thumbnailSize: 150,
} as const;
