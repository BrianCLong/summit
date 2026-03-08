"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_CONFIG = exports.CACHE_CONFIG = exports.FEATURES = exports.NOTIFICATION_CONFIG = exports.MAP_CONFIG = exports.DB_CONFIG = exports.SYNC_CONFIG = exports.AUTH_CONFIG = exports.API_CONFIG = exports.ENV = void 0;
const react_native_dotenv_1 = __importDefault(require("react-native-dotenv"));
// Environment configuration
exports.ENV = {
    isDevelopment: __DEV__,
    isProduction: !__DEV__,
};
// API Configuration
exports.API_CONFIG = {
    baseUrl: react_native_dotenv_1.default.API_URL || 'https://api.intelgraph.io',
    graphqlUrl: react_native_dotenv_1.default.GRAPHQL_URL || 'https://api.intelgraph.io/graphql',
    wsUrl: react_native_dotenv_1.default.WS_URL || 'wss://api.intelgraph.io/graphql',
    timeout: 30000,
};
// Auth Configuration
exports.AUTH_CONFIG = {
    tokenKey: '@intelgraph/auth_token',
    refreshTokenKey: '@intelgraph/refresh_token',
    userKey: '@intelgraph/user',
    biometricKey: '@intelgraph/biometric_enabled',
    pinKey: '@intelgraph/pin_hash',
    tokenRefreshBuffer: 5 * 60 * 1000, // 5 minutes before expiry
};
// Offline/Sync Configuration
exports.SYNC_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    batchSize: 50,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxOfflineAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    conflictResolution: 'server-wins',
};
// Database Configuration
exports.DB_CONFIG = {
    name: 'intelgraph_mobile',
    version: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
};
// Map Configuration
exports.MAP_CONFIG = {
    defaultCenter: {
        latitude: 38.8977,
        longitude: -77.0365,
    },
    defaultZoom: 10,
    clusterRadius: 50,
    maxClusterZoom: 14,
    renderedPointsPageSize: 200,
    mapboxAccessToken: react_native_dotenv_1.default.MAPBOX_ACCESS_TOKEN || '',
    styles: {
        satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
        streets: 'mapbox://styles/mapbox/streets-v12',
        dark: 'mapbox://styles/mapbox/dark-v11',
        light: 'mapbox://styles/mapbox/light-v11',
    },
};
// Notification Configuration
exports.NOTIFICATION_CONFIG = {
    channelId: 'intelgraph-alerts',
    channelName: 'IntelGraph Alerts',
    androidSmallIcon: 'ic_notification',
    firebaseVapidKey: react_native_dotenv_1.default.FIREBASE_VAPID_KEY || '',
};
// Feature Flags
exports.FEATURES = {
    enableOfflineMode: true,
    enableBiometrics: true,
    enablePushNotifications: true,
    enableBackgroundSync: true,
    enableGEOINT: true,
    enableRealTimeUpdates: true,
    enableAnalytics: !__DEV__,
    enableCrashReporting: !__DEV__,
    enableGEOINTClustering: true,
};
// Cache Configuration
exports.CACHE_CONFIG = {
    maxAge: {
        entities: 15 * 60 * 1000, // 15 minutes
        investigations: 5 * 60 * 1000, // 5 minutes
        alerts: 1 * 60 * 1000, // 1 minute
        user: 60 * 60 * 1000, // 1 hour
    },
    staleWhileRevalidate: true,
};
// Performance Configuration
exports.PERFORMANCE_CONFIG = {
    maxListItems: 100,
    pageSize: 20,
    imageQuality: 0.8,
    thumbnailSize: 150,
};
