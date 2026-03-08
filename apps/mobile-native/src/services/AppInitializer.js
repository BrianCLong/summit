"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = void 0;
const react_native_1 = require("react-native");
const netinfo_1 = __importDefault(require("@react-native-community/netinfo"));
const Sentry = __importStar(require("@sentry/react-native"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const analytics_1 = __importDefault(require("@react-native-firebase/analytics"));
const GraphQLClient_1 = require("./GraphQLClient");
const config_1 = require("../config");
const Database_1 = require("./Database");
const BackgroundTasks_1 = require("./BackgroundTasks");
const LocationService_1 = require("./LocationService");
const NotificationService_1 = require("./NotificationService");
const initializeApp = async () => {
    console.log('Initializing app...');
    // Initialize Sentry for error tracking
    if (config_1.SENTRY_DSN) {
        Sentry.init({
            dsn: config_1.SENTRY_DSN,
            environment: config_1.SENTRY_ENV,
            enableAutoSessionTracking: true,
            sessionTrackingIntervalMillis: 30000,
            tracesSampleRate: 1.0,
            integrations: [
                new Sentry.ReactNativeTracing({
                    tracingOrigins: ['localhost', /^\//],
                    routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
                }),
            ],
        });
    }
    // Initialize Firebase Analytics
    if (react_native_1.Platform.OS !== 'web') {
        await (0, analytics_1.default)().setAnalyticsCollectionEnabled(true);
    }
    // Check network connectivity
    const networkState = await netinfo_1.default.fetch();
    console.log('Network state:', networkState);
    // Initialize local database
    await (0, Database_1.initializeDatabase)();
    // Restore Apollo cache
    await (0, GraphQLClient_1.restoreCache)();
    // Request location permission (for location-based features)
    await (0, LocationService_1.requestLocationPermission)();
    // Setup push notifications
    if (config_1.ENABLE_PUSH_NOTIFICATIONS) {
        await (0, NotificationService_1.setupPushNotifications)();
    }
    // Register background tasks
    await (0, BackgroundTasks_1.registerBackgroundTasks)();
    // Request notification permission
    if (react_native_1.Platform.OS === 'ios') {
        const authStatus = await (0, messaging_1.default)().requestPermission();
        const enabled = authStatus === messaging_1.default.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging_1.default.AuthorizationStatus.PROVISIONAL;
        if (enabled) {
            console.log('Notification permission granted');
        }
    }
    console.log('App initialized successfully');
};
exports.initializeApp = initializeApp;
