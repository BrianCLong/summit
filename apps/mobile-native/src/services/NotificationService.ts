import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  Notification,
} from '@notifee/react-native';
import PushNotification from 'react-native-push-notification';

import {storage} from './Database';

// Setup push notifications
export const setupPushNotifications = async (): Promise<void> => {
  console.log('[Notifications] Setting up push notifications...');

  // Request permission
  await requestNotificationPermission();

  // Get FCM token
  const token = await getFCMToken();
  if (token) {
    storage.set('fcm_token', token);
    console.log('[Notifications] FCM Token:', token);
  }

  // Listen for token refresh
  messaging().onTokenRefresh((newToken) => {
    console.log('[Notifications] FCM Token refreshed:', newToken);
    storage.set('fcm_token', newToken);
    // Send token to server
    sendTokenToServer(newToken);
  });

  // Handle foreground notifications
  messaging().onMessage(async (remoteMessage) => {
    console.log('[Notifications] Foreground message:', remoteMessage);
    await displayNotification(remoteMessage);
  });

  // Handle background notifications
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Notifications] Background message:', remoteMessage);
    await displayNotification(remoteMessage);
  });

  // Handle notification press
  notifee.onForegroundEvent(async ({type, detail}) => {
    if (type === EventType.PRESS) {
      console.log('[Notifications] Notification pressed:', detail);
      await handleNotificationPress(detail.notification);
    }
  });

  notifee.onBackgroundEvent(async ({type, detail}) => {
    if (type === EventType.PRESS) {
      console.log('[Notifications] Background notification pressed:', detail);
      await handleNotificationPress(detail.notification);
    }
  });

  // Create notification channels (Android)
  if (Platform.OS === 'android') {
    await createNotificationChannels();
  }

  // Configure PushNotification
  PushNotification.configure({
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

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('[Notifications] Permission status:', authStatus);

    return enabled;
  } catch (error) {
    console.error('[Notifications] Failed to request permission:', error);
    return false;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get FCM token:', error);
    return null;
  }
};

// Send token to server
const sendTokenToServer = async (token: string): Promise<void> => {
  try {
    // TODO: Send token to server
    console.log('[Notifications] Sending token to server:', token);
  } catch (error) {
    console.error('[Notifications] Failed to send token to server:', error);
  }
};

// Display notification
export const displayNotification = async (remoteMessage: any): Promise<void> => {
  const {notification, data} = remoteMessage;

  if (!notification) {
    return;
  }

  try {
    const channelId = await notifee.createChannel({
      id: data?.channelId || 'default',
      name: data?.channelName || 'Default',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_notification',
        largeIcon: notification.android?.imageUrl,
        style: notification.android?.imageUrl
          ? {
              type: AndroidStyle.BIGPICTURE,
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
  } catch (error) {
    console.error('[Notifications] Failed to display notification:', error);
  }
};

// Create notification channels (Android)
const createNotificationChannels = async (): Promise<void> => {
  await notifee.createChannels([
    {
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
    },
    {
      id: 'alerts',
      name: 'Intelligence Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    },
    {
      id: 'updates',
      name: 'Case Updates',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    },
    {
      id: 'sync',
      name: 'Sync Notifications',
      importance: AndroidImportance.LOW,
    },
  ]);

  console.log('[Notifications] Notification channels created');
};

// Handle notification press
const handleNotificationPress = async (notification?: Notification): Promise<void> => {
  if (!notification?.data) {
    return;
  }

  const {type, entityId, caseId} = notification.data;

  console.log('[Notifications] Handling notification press:', {type, entityId, caseId});

  // TODO: Navigate to appropriate screen based on notification data
  // This will require access to navigation, which should be handled in the app layer
};

// Schedule local notification
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: any,
  triggerDate?: Date,
): Promise<string> => {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default',
    importance: AndroidImportance.HIGH,
  });

  const notificationId = await notifee.displayNotification({
    title,
    body,
    data,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
    },
  });

  return notificationId;
};

// Cancel notification
export const cancelNotification = async (notificationId: string): Promise<void> => {
  await notifee.cancelNotification(notificationId);
};

// Cancel all notifications
export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
};

// Get badge count
export const getBadgeCount = (): Promise<number> => {
  return notifee.getBadgeCount();
};

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
  await notifee.setBadgeCount(count);
};

// Increment badge count
export const incrementBadgeCount = async (): Promise<void> => {
  const currentCount = await getBadgeCount();
  await setBadgeCount(currentCount + 1);
};

// Decrement badge count
export const decrementBadgeCount = async (): Promise<void> => {
  const currentCount = await getBadgeCount();
  await setBadgeCount(Math.max(0, currentCount - 1));
};

// Clear badge count
export const clearBadgeCount = async (): Promise<void> => {
  await setBadgeCount(0);
};
