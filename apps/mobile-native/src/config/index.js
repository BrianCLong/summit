"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYNC_BATCH_SIZE = exports.MAX_SYNC_RETRIES = exports.SYNC_INTERVAL = exports.GEOFENCE_RADIUS_DEFAULT = exports.LOCATION_DISTANCE_FILTER = exports.LOCATION_UPDATE_INTERVAL = exports.SUPPORTED_AUDIO_FORMATS = exports.SUPPORTED_VIDEO_FORMATS = exports.SUPPORTED_IMAGE_FORMATS = exports.MAX_AUDIO_SIZE = exports.MAX_VIDEO_SIZE = exports.MAX_PHOTO_SIZE = exports.MAX_CACHE_SIZE = exports.CACHE_DURATION = exports.RETRY_DELAY = exports.MAX_RETRY_ATTEMPTS = exports.REQUEST_TIMEOUT = exports.APP_BUILD = exports.APP_VERSION = exports.CODEPUSH_KEY_ANDROID = exports.CODEPUSH_KEY_IOS = exports.ENABLE_OTA_UPDATES = exports.ENABLE_PUSH_NOTIFICATIONS = exports.ENABLE_LOCATION_TRACKING = exports.ENABLE_BIOMETRIC_AUTH = exports.ENABLE_OFFLINE_MODE = exports.SENTRY_ENV = exports.SENTRY_DSN = exports.FIREBASE_APP_ID = exports.FIREBASE_MESSAGING_SENDER_ID = exports.FIREBASE_STORAGE_BUCKET = exports.FIREBASE_PROJECT_ID = exports.FIREBASE_AUTH_DOMAIN = exports.FIREBASE_API_KEY = exports.GOOGLE_MAPS_API_KEY_ANDROID = exports.GOOGLE_MAPS_API_KEY_IOS = exports.WS_URL = exports.GRAPHQL_URL = exports.API_URL = void 0;
// @ts-ignore
const react_native_dotenv_1 = __importDefault(require("react-native-dotenv"));
// API Configuration
exports.API_URL = react_native_dotenv_1.default.API_URL || 'https://api.intelgraph.com';
exports.GRAPHQL_URL = react_native_dotenv_1.default.GRAPHQL_URL || `${exports.API_URL}/graphql`;
exports.WS_URL = react_native_dotenv_1.default.WS_URL || `wss://api.intelgraph.com/graphql`;
// Firebase Configuration
exports.GOOGLE_MAPS_API_KEY_IOS = react_native_dotenv_1.default.GOOGLE_MAPS_API_KEY_IOS || '';
exports.GOOGLE_MAPS_API_KEY_ANDROID = react_native_dotenv_1.default.GOOGLE_MAPS_API_KEY_ANDROID || '';
exports.FIREBASE_API_KEY = react_native_dotenv_1.default.FIREBASE_API_KEY || '';
exports.FIREBASE_AUTH_DOMAIN = react_native_dotenv_1.default.FIREBASE_AUTH_DOMAIN || '';
exports.FIREBASE_PROJECT_ID = react_native_dotenv_1.default.FIREBASE_PROJECT_ID || '';
exports.FIREBASE_STORAGE_BUCKET = react_native_dotenv_1.default.FIREBASE_STORAGE_BUCKET || '';
exports.FIREBASE_MESSAGING_SENDER_ID = react_native_dotenv_1.default.FIREBASE_MESSAGING_SENDER_ID || '';
exports.FIREBASE_APP_ID = react_native_dotenv_1.default.FIREBASE_APP_ID || '';
// Sentry Configuration
exports.SENTRY_DSN = react_native_dotenv_1.default.SENTRY_DSN || '';
exports.SENTRY_ENV = react_native_dotenv_1.default.SENTRY_ENV || 'development';
// Feature Flags
exports.ENABLE_OFFLINE_MODE = react_native_dotenv_1.default.ENABLE_OFFLINE_MODE === 'true';
exports.ENABLE_BIOMETRIC_AUTH = react_native_dotenv_1.default.ENABLE_BIOMETRIC_AUTH === 'true';
exports.ENABLE_LOCATION_TRACKING = react_native_dotenv_1.default.ENABLE_LOCATION_TRACKING === 'true';
exports.ENABLE_PUSH_NOTIFICATIONS = react_native_dotenv_1.default.ENABLE_PUSH_NOTIFICATIONS === 'true';
exports.ENABLE_OTA_UPDATES = react_native_dotenv_1.default.ENABLE_OTA_UPDATES === 'true';
// CodePush Configuration
exports.CODEPUSH_KEY_IOS = react_native_dotenv_1.default.CODEPUSH_KEY_IOS || '';
exports.CODEPUSH_KEY_ANDROID = react_native_dotenv_1.default.CODEPUSH_KEY_ANDROID || '';
// App Configuration
exports.APP_VERSION = '1.0.0';
exports.APP_BUILD = '1';
// Network Configuration
exports.REQUEST_TIMEOUT = 30000; // 30 seconds
exports.MAX_RETRY_ATTEMPTS = 3;
exports.RETRY_DELAY = 1000; // 1 second
// Cache Configuration
exports.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
exports.MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB
// Media Configuration
exports.MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB
exports.MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
exports.MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB
exports.SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
exports.SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'mkv'];
exports.SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'aac'];
// Location Configuration
exports.LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
exports.LOCATION_DISTANCE_FILTER = 10; // 10 meters
exports.GEOFENCE_RADIUS_DEFAULT = 100; // 100 meters
// Sync Configuration
exports.SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
exports.MAX_SYNC_RETRIES = 3;
exports.SYNC_BATCH_SIZE = 50;
