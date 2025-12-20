// @ts-ignore
import Config from 'react-native-dotenv';

// API Configuration
export const API_URL = Config.API_URL || 'https://api.intelgraph.com';
export const GRAPHQL_URL = Config.GRAPHQL_URL || `${API_URL}/graphql`;
export const WS_URL = Config.WS_URL || `wss://api.intelgraph.com/graphql`;

// Firebase Configuration
export const GOOGLE_MAPS_API_KEY_IOS = Config.GOOGLE_MAPS_API_KEY_IOS || '';
export const GOOGLE_MAPS_API_KEY_ANDROID = Config.GOOGLE_MAPS_API_KEY_ANDROID || '';
export const FIREBASE_API_KEY = Config.FIREBASE_API_KEY || '';
export const FIREBASE_AUTH_DOMAIN = Config.FIREBASE_AUTH_DOMAIN || '';
export const FIREBASE_PROJECT_ID = Config.FIREBASE_PROJECT_ID || '';
export const FIREBASE_STORAGE_BUCKET = Config.FIREBASE_STORAGE_BUCKET || '';
export const FIREBASE_MESSAGING_SENDER_ID = Config.FIREBASE_MESSAGING_SENDER_ID || '';
export const FIREBASE_APP_ID = Config.FIREBASE_APP_ID || '';

// Sentry Configuration
export const SENTRY_DSN = Config.SENTRY_DSN || '';
export const SENTRY_ENV = Config.SENTRY_ENV || 'development';

// Feature Flags
export const ENABLE_OFFLINE_MODE = Config.ENABLE_OFFLINE_MODE === 'true';
export const ENABLE_BIOMETRIC_AUTH = Config.ENABLE_BIOMETRIC_AUTH === 'true';
export const ENABLE_LOCATION_TRACKING = Config.ENABLE_LOCATION_TRACKING === 'true';
export const ENABLE_PUSH_NOTIFICATIONS = Config.ENABLE_PUSH_NOTIFICATIONS === 'true';
export const ENABLE_OTA_UPDATES = Config.ENABLE_OTA_UPDATES === 'true';

// CodePush Configuration
export const CODEPUSH_KEY_IOS = Config.CODEPUSH_KEY_IOS || '';
export const CODEPUSH_KEY_ANDROID = Config.CODEPUSH_KEY_ANDROID || '';

// App Configuration
export const APP_VERSION = '1.0.0';
export const APP_BUILD = '1';

// Network Configuration
export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

// Cache Configuration
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB

// Media Configuration
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB
export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'mkv'];
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'aac'];

// Location Configuration
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const LOCATION_DISTANCE_FILTER = 10; // 10 meters
export const GEOFENCE_RADIUS_DEFAULT = 100; // 100 meters

// Sync Configuration
export const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const MAX_SYNC_RETRIES = 3;
export const SYNC_BATCH_SIZE = 50;
