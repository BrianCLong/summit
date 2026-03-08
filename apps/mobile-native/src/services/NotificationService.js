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
exports.clearBadgeCount = exports.decrementBadgeCount = exports.incrementBadgeCount = exports.setBadgeCount = exports.getBadgeCount = exports.cancelAllNotifications = exports.cancelNotification = exports.scheduleLocalNotification = exports.displayNotification = exports.getFCMToken = exports.requestNotificationPermission = exports.setupPushNotifications = void 0;
const react_native_1 = require("react-native");
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const react_native_2 = __importStar(require("@notifee/react-native"));
const react_native_push_notification_1 = __importDefault(require("react-native-push-notification"));
const Database_1 = require("./Database");
// Setup push notifications
const setupPushNotifications = async () => {
    console.log('[Notifications] Setting up push notifications...');
    // Request permission
    await (0, exports.requestNotificationPermission)();
    // Get FCM token
    const token = await (0, exports.getFCMToken)();
    if (token) {
        Database_1.storage.set('fcm_token', token);
        console.log('[Notifications] FCM Token:', token);
    }
    // Listen for token refresh
    (0, messaging_1.default)().onTokenRefresh((newToken) => {
        console.log('[Notifications] FCM Token refreshed:', newToken);
        Database_1.storage.set('fcm_token', newToken);
        // Send token to server
        sendTokenToServer(newToken);
    });
    // Handle foreground notifications
    (0, messaging_1.default)().onMessage(async (remoteMessage) => {
        console.log('[Notifications] Foreground message:', remoteMessage);
        await (0, exports.displayNotification)(remoteMessage);
    });
    // Handle background notifications
    (0, messaging_1.default)().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('[Notifications] Background message:', remoteMessage);
        await (0, exports.displayNotification)(remoteMessage);
    });
    // Handle notification press
    react_native_2.default.onForegroundEvent(async ({ type, detail }) => {
        if (type === react_native_2.EventType.PRESS) {
            console.log('[Notifications] Notification pressed:', detail);
            await handleNotificationPress(detail.notification);
        }
    });
    react_native_2.default.onBackgroundEvent(async ({ type, detail }) => {
        if (type === react_native_2.EventType.PRESS) {
            console.log('[Notifications] Background notification pressed:', detail);
            await handleNotificationPress(detail.notification);
        }
    });
    // Create notification channels (Android)
    if (react_native_1.Platform.OS === 'android') {
        await createNotificationChannels();
    }
    // Configure PushNotification
    react_native_push_notification_1.default.configure({
        onRegister: (token) => {
            console.log('[Notifications] Device token:', token);
        },
        onNotification: (notification) => {
            console.log('[Notifications] Local notification:', notification);
        },
        permissions: {
            alert: true,
            badge: true,
            sound: true,
        },
        popInitialNotification: true,
        requestPermissions: true,
    });
    console.log('[Notifications] Push notifications setup complete');
};
exports.setupPushNotifications = setupPushNotifications;
// Request notification permission
const requestNotificationPermission = async () => {
    try {
        const authStatus = await (0, messaging_1.default)().requestPermission();
        const enabled = authStatus === messaging_1.default.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging_1.default.AuthorizationStatus.PROVISIONAL;
        console.log('[Notifications] Permission status:', authStatus);
        return enabled;
    }
    catch (error) {
        console.error('[Notifications] Failed to request permission:', error);
        return false;
    }
};
exports.requestNotificationPermission = requestNotificationPermission;
// Get FCM token
const getFCMToken = async () => {
    try {
        const token = await (0, messaging_1.default)().getToken();
        return token;
    }
    catch (error) {
        console.error('[Notifications] Failed to get FCM token:', error);
        return null;
    }
};
exports.getFCMToken = getFCMToken;
// Send token to server
const sendTokenToServer = async (token) => {
    try {
        // TODO: Send token to server
        console.log('[Notifications] Sending token to server:', token);
    }
    catch (error) {
        console.error('[Notifications] Failed to send token to server:', error);
    }
};
// Display notification
const displayNotification = async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (!notification) {
        return;
    }
    try {
        const channelId = await react_native_2.default.createChannel({
            id: data?.channelId || 'default',
            name: data?.channelName || 'Default',
            importance: react_native_2.AndroidImportance.HIGH,
        });
        await react_native_2.default.displayNotification({
            title: notification.title,
            body: notification.body,
            data,
            android: {
                channelId,
                importance: react_native_2.AndroidImportance.HIGH,
                pressAction: {
                    id: 'default',
                },
                smallIcon: 'ic_notification',
                largeIcon: notification.android?.imageUrl,
                style: notification.android?.imageUrl
                    ? {
                        type: react_native_2.AndroidStyle.BIGPICTURE,
                        picture: notification.android.imageUrl,
                    }
                    : undefined,
            },
            ios: {
                attachments: notification.ios?.imageUrl
                    ? [
                        {
                            url: notification.ios.imageUrl,
                        },
                    ]
                    : undefined,
            },
        });
    }
    catch (error) {
        console.error('[Notifications] Failed to display notification:', error);
    }
};
exports.displayNotification = displayNotification;
// Create notification channels (Android)
const createNotificationChannels = async () => {
    await react_native_2.default.createChannels([
        {
            id: 'default',
            name: 'Default',
            importance: react_native_2.AndroidImportance.HIGH,
        },
        {
            id: 'alerts',
            name: 'Intelligence Alerts',
            importance: react_native_2.AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
        },
        {
            id: 'updates',
            name: 'Case Updates',
            importance: react_native_2.AndroidImportance.DEFAULT,
            sound: 'default',
        },
        {
            id: 'sync',
            name: 'Sync Notifications',
            importance: react_native_2.AndroidImportance.LOW,
        },
    ]);
    console.log('[Notifications] Notification channels created');
};
// Handle notification press
const handleNotificationPress = async (notification) => {
    if (!notification?.data) {
        return;
    }
    const { type, entityId, caseId } = notification.data;
    console.log('[Notifications] Handling notification press:', { type, entityId, caseId });
    // TODO: Navigate to appropriate screen based on notification data
    // This will require access to navigation, which should be handled in the app layer
};
// Schedule local notification
const scheduleLocalNotification = async (title, body, data, _triggerDate) => {
    const channelId = await react_native_2.default.createChannel({
        id: 'default',
        name: 'Default',
        importance: react_native_2.AndroidImportance.HIGH,
    });
    const notificationId = await react_native_2.default.displayNotification({
        title,
        body,
        data,
        android: {
            channelId,
            importance: react_native_2.AndroidImportance.HIGH,
            pressAction: {
                id: 'default',
            },
        },
    });
    return notificationId;
};
exports.scheduleLocalNotification = scheduleLocalNotification;
// Cancel notification
const cancelNotification = async (notificationId) => {
    await react_native_2.default.cancelNotification(notificationId);
};
exports.cancelNotification = cancelNotification;
// Cancel all notifications
const cancelAllNotifications = async () => {
    await react_native_2.default.cancelAllNotifications();
};
exports.cancelAllNotifications = cancelAllNotifications;
// Get badge count
const getBadgeCount = () => {
    return react_native_2.default.getBadgeCount();
};
exports.getBadgeCount = getBadgeCount;
// Set badge count
const setBadgeCount = async (count) => {
    await react_native_2.default.setBadgeCount(count);
};
exports.setBadgeCount = setBadgeCount;
// Increment badge count
const incrementBadgeCount = async () => {
    const currentCount = await (0, exports.getBadgeCount)();
    await (0, exports.setBadgeCount)(currentCount + 1);
};
exports.incrementBadgeCount = incrementBadgeCount;
// Decrement badge count
const decrementBadgeCount = async () => {
    const currentCount = await (0, exports.getBadgeCount)();
    await (0, exports.setBadgeCount)(Math.max(0, currentCount - 1));
};
exports.decrementBadgeCount = decrementBadgeCount;
// Clear badge count
const clearBadgeCount = async () => {
    await (0, exports.setBadgeCount)(0);
};
exports.clearBadgeCount = clearBadgeCount;
