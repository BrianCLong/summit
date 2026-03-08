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
exports.decrementBadgeCount = exports.incrementBadgeCount = exports.getBadgeCount = exports.setBadgeCount = exports.cancelAllNotifications = exports.cancelNotification = exports.showSyncNotification = exports.showAlertNotification = exports.showLocalNotification = exports.onTokenRefresh = exports.getFCMToken = exports.requestNotificationPermissions = exports.initializeNotifications = void 0;
const react_native_1 = __importStar(require("@notifee/react-native"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const react_native_2 = require("react-native");
const config_1 = require("@/config");
// ============================================
// Setup & Permissions
// ============================================
const initializeNotifications = async () => {
    // Request permissions
    await (0, exports.requestNotificationPermissions)();
    // Create notification channels (Android)
    await createNotificationChannels();
    // Setup FCM listeners
    setupFCMListeners();
    // Handle background events
    react_native_1.default.onBackgroundEvent(handleBackgroundEvent);
    console.log('[NotificationService] Initialized');
};
exports.initializeNotifications = initializeNotifications;
const requestNotificationPermissions = async () => {
    // Request FCM permission
    const authStatus = await (0, messaging_1.default)().requestPermission();
    const enabled = authStatus === messaging_1.default.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging_1.default.AuthorizationStatus.PROVISIONAL;
    if (enabled) {
        console.log('[NotificationService] Permission granted:', authStatus);
    }
    // Request notifee permissions (iOS)
    if (react_native_2.Platform.OS === 'ios') {
        await react_native_1.default.requestPermission();
    }
    return enabled;
};
exports.requestNotificationPermissions = requestNotificationPermissions;
const createNotificationChannels = async () => {
    if (react_native_2.Platform.OS !== 'android')
        return;
    // Critical alerts channel
    await react_native_1.default.createChannel({
        id: 'critical-alerts',
        name: 'Critical Alerts',
        description: 'High-priority intelligence alerts requiring immediate attention',
        importance: react_native_1.AndroidImportance.HIGH,
        visibility: react_native_1.AndroidVisibility.PUBLIC,
        sound: 'critical_alert',
        vibration: true,
        lights: true,
        lightColor: '#ef4444',
    });
    // Standard alerts channel
    await react_native_1.default.createChannel({
        id: 'alerts',
        name: 'OSINT Alerts',
        description: 'Intelligence alerts and updates',
        importance: react_native_1.AndroidImportance.DEFAULT,
        visibility: react_native_1.AndroidVisibility.PRIVATE,
        sound: 'default',
        vibration: true,
    });
    // Entity updates channel
    await react_native_1.default.createChannel({
        id: 'entity-updates',
        name: 'Entity Updates',
        description: 'Updates to tracked entities',
        importance: react_native_1.AndroidImportance.LOW,
        visibility: react_native_1.AndroidVisibility.PRIVATE,
    });
    // Sync notifications channel
    await react_native_1.default.createChannel({
        id: 'sync',
        name: 'Sync Status',
        description: 'Background sync notifications',
        importance: react_native_1.AndroidImportance.MIN,
        visibility: react_native_1.AndroidVisibility.SECRET,
    });
};
// ============================================
// FCM Token Management
// ============================================
const getFCMToken = async () => {
    try {
        const token = await (0, messaging_1.default)().getToken();
        console.log('[NotificationService] FCM Token:', token);
        return token;
    }
    catch (error) {
        console.error('[NotificationService] Failed to get FCM token:', error);
        return null;
    }
};
exports.getFCMToken = getFCMToken;
const onTokenRefresh = (callback) => {
    return (0, messaging_1.default)().onTokenRefresh(callback);
};
exports.onTokenRefresh = onTokenRefresh;
// ============================================
// FCM Listeners
// ============================================
const setupFCMListeners = () => {
    // Foreground messages
    (0, messaging_1.default)().onMessage(async (remoteMessage) => {
        console.log('[NotificationService] Foreground message:', remoteMessage);
        await handleRemoteMessage(remoteMessage);
    });
    // Background/quit state message opened
    (0, messaging_1.default)().onNotificationOpenedApp((remoteMessage) => {
        console.log('[NotificationService] Notification opened app:', remoteMessage);
        handleNotificationOpen(remoteMessage);
    });
    // Check if app was opened from notification
    (0, messaging_1.default)()
        .getInitialNotification()
        .then((remoteMessage) => {
        if (remoteMessage) {
            console.log('[NotificationService] Initial notification:', remoteMessage);
            handleNotificationOpen(remoteMessage);
        }
    });
};
const handleRemoteMessage = async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (!notification)
        return;
    const priority = data?.priority || 'INFO';
    const channelId = priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';
    await react_native_1.default.displayNotification({
        title: notification.title,
        body: notification.body,
        android: {
            channelId,
            smallIcon: config_1.NOTIFICATION_CONFIG.androidSmallIcon,
            pressAction: { id: 'default' },
            ...(data?.alertId && { tag: data.alertId }),
        },
        ios: {
            sound: priority === 'CRITICAL' ? 'critical_alert.wav' : 'default',
            critical: priority === 'CRITICAL',
        },
        data: data,
    });
};
const handleNotificationOpen = (remoteMessage) => {
    const { data } = remoteMessage;
    if (data?.alertId) {
        // Navigate to alert details
        // This would typically emit an event that the navigation system listens to
        console.log('[NotificationService] Navigate to alert:', data.alertId);
    }
};
const handleBackgroundEvent = async (event) => {
    const { type, detail } = event;
    switch (type) {
        case react_native_1.EventType.DISMISSED:
            console.log('[NotificationService] Notification dismissed:', detail.notification?.id);
            break;
        case react_native_1.EventType.PRESS:
            console.log('[NotificationService] Notification pressed:', detail.notification?.data);
            break;
        case react_native_1.EventType.ACTION_PRESS:
            console.log('[NotificationService] Action pressed:', detail.pressAction?.id);
            break;
    }
};
// ============================================
// Local Notifications
// ============================================
const showLocalNotification = async (title, body, data, priority = 'INFO') => {
    const channelId = priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';
    return react_native_1.default.displayNotification({
        title,
        body,
        android: {
            channelId,
            smallIcon: config_1.NOTIFICATION_CONFIG.androidSmallIcon,
            pressAction: { id: 'default' },
        },
        data,
    });
};
exports.showLocalNotification = showLocalNotification;
const showAlertNotification = async (alert) => {
    const channelId = alert.priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';
    return react_native_1.default.displayNotification({
        title: `[${alert.priority}] ${alert.title}`,
        body: alert.description,
        android: {
            channelId,
            smallIcon: config_1.NOTIFICATION_CONFIG.androidSmallIcon,
            tag: alert.id,
            pressAction: { id: 'default' },
            actions: [
                { title: 'View', pressAction: { id: 'view' } },
                { title: 'Acknowledge', pressAction: { id: 'acknowledge' } },
            ],
            style: {
                type: 1, // BigTextStyle
                text: alert.description,
            },
        },
        ios: {
            sound: alert.priority === 'CRITICAL' ? 'critical_alert.wav' : 'default',
            critical: alert.priority === 'CRITICAL',
            categoryId: 'alert',
        },
        data: {
            alertId: alert.id,
            type: 'alert',
        },
    });
};
exports.showAlertNotification = showAlertNotification;
const showSyncNotification = async (title, body, progress) => {
    return react_native_1.default.displayNotification({
        id: 'sync-notification',
        title,
        body,
        android: {
            channelId: 'sync',
            smallIcon: config_1.NOTIFICATION_CONFIG.androidSmallIcon,
            ongoing: progress !== undefined && progress < 100,
            progress: progress !== undefined ? { max: 100, current: progress } : undefined,
        },
    });
};
exports.showSyncNotification = showSyncNotification;
const cancelNotification = async (id) => {
    await react_native_1.default.cancelNotification(id);
};
exports.cancelNotification = cancelNotification;
const cancelAllNotifications = async () => {
    await react_native_1.default.cancelAllNotifications();
};
exports.cancelAllNotifications = cancelAllNotifications;
// ============================================
// Badge Management
// ============================================
const setBadgeCount = async (count) => {
    await react_native_1.default.setBadgeCount(count);
};
exports.setBadgeCount = setBadgeCount;
const getBadgeCount = async () => {
    return react_native_1.default.getBadgeCount();
};
exports.getBadgeCount = getBadgeCount;
const incrementBadgeCount = async () => {
    const current = await (0, exports.getBadgeCount)();
    await (0, exports.setBadgeCount)(current + 1);
};
exports.incrementBadgeCount = incrementBadgeCount;
const decrementBadgeCount = async () => {
    const current = await (0, exports.getBadgeCount)();
    await (0, exports.setBadgeCount)(Math.max(0, current - 1));
};
exports.decrementBadgeCount = decrementBadgeCount;
