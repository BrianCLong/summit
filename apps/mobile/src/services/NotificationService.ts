import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
  type Notification,
  type Event,
} from '@notifee/react-native';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { NOTIFICATION_CONFIG } from '@/config';
import type { OSINTAlert, Priority } from '@/types';

// ============================================
// Setup & Permissions
// ============================================

export const initializeNotifications = async (): Promise<void> => {
  // Request permissions
  await requestNotificationPermissions();

  // Create notification channels (Android)
  await createNotificationChannels();

  // Setup FCM listeners
  setupFCMListeners();

  // Handle background events
  notifee.onBackgroundEvent(handleBackgroundEvent);

  console.log('[NotificationService] Initialized');
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  // Request FCM permission
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('[NotificationService] Permission granted:', authStatus);
  }

  // Request notifee permissions (iOS)
  if (Platform.OS === 'ios') {
    await notifee.requestPermission();
  }

  return enabled;
};

const createNotificationChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  // Critical alerts channel
  await notifee.createChannel({
    id: 'critical-alerts',
    name: 'Critical Alerts',
    description: 'High-priority intelligence alerts requiring immediate attention',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'critical_alert',
    vibration: true,
    lights: true,
    lightColor: '#ef4444',
  });

  // Standard alerts channel
  await notifee.createChannel({
    id: 'alerts',
    name: 'OSINT Alerts',
    description: 'Intelligence alerts and updates',
    importance: AndroidImportance.DEFAULT,
    visibility: AndroidVisibility.PRIVATE,
    sound: 'default',
    vibration: true,
  });

  // Entity updates channel
  await notifee.createChannel({
    id: 'entity-updates',
    name: 'Entity Updates',
    description: 'Updates to tracked entities',
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PRIVATE,
  });

  // Sync notifications channel
  await notifee.createChannel({
    id: 'sync',
    name: 'Sync Status',
    description: 'Background sync notifications',
    importance: AndroidImportance.MIN,
    visibility: AndroidVisibility.SECRET,
  });
};

// ============================================
// FCM Token Management
// ============================================

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await messaging().getToken();
    console.log('[NotificationService] FCM Token:', token);
    return token;
  } catch (error) {
    console.error('[NotificationService] Failed to get FCM token:', error);
    return null;
  }
};

export const onTokenRefresh = (callback: (token: string) => void): () => void => {
  return messaging().onTokenRefresh(callback);
};

// ============================================
// FCM Listeners
// ============================================

const setupFCMListeners = (): void => {
  // Foreground messages
  messaging().onMessage(async (remoteMessage) => {
    console.log('[NotificationService] Foreground message:', remoteMessage);
    await handleRemoteMessage(remoteMessage);
  });

  // Background/quit state message opened
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[NotificationService] Notification opened app:', remoteMessage);
    handleNotificationOpen(remoteMessage);
  });

  // Check if app was opened from notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[NotificationService] Initial notification:', remoteMessage);
        handleNotificationOpen(remoteMessage);
      }
    });
};

const handleRemoteMessage = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> => {
  const { notification, data } = remoteMessage;

  if (!notification) return;

  const priority = (data?.priority as Priority) || 'INFO';
  const channelId = priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';

  await notifee.displayNotification({
    title: notification.title,
    body: notification.body,
    android: {
      channelId,
      smallIcon: NOTIFICATION_CONFIG.androidSmallIcon,
      pressAction: { id: 'default' },
      ...(data?.alertId && { tag: data.alertId as string }),
    },
    ios: {
      sound: priority === 'CRITICAL' ? 'critical_alert.wav' : 'default',
      critical: priority === 'CRITICAL',
    },
    data: data as Record<string, string>,
  });
};

const handleNotificationOpen = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): void => {
  const { data } = remoteMessage;
  if (data?.alertId) {
    // Navigate to alert details
    // This would typically emit an event that the navigation system listens to
    console.log('[NotificationService] Navigate to alert:', data.alertId);
  }
};

const handleBackgroundEvent = async (event: Event): Promise<void> => {
  const { type, detail } = event;

  switch (type) {
    case EventType.DISMISSED:
      console.log('[NotificationService] Notification dismissed:', detail.notification?.id);
      break;
    case EventType.PRESS:
      console.log('[NotificationService] Notification pressed:', detail.notification?.data);
      break;
    case EventType.ACTION_PRESS:
      console.log('[NotificationService] Action pressed:', detail.pressAction?.id);
      break;
  }
};

// ============================================
// Local Notifications
// ============================================

export const showLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, string>,
  priority: Priority = 'INFO',
): Promise<string> => {
  const channelId = priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';

  return notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      smallIcon: NOTIFICATION_CONFIG.androidSmallIcon,
      pressAction: { id: 'default' },
    },
    data,
  });
};

export const showAlertNotification = async (alert: OSINTAlert): Promise<string> => {
  const channelId = alert.priority === 'CRITICAL' ? 'critical-alerts' : 'alerts';

  return notifee.displayNotification({
    title: `[${alert.priority}] ${alert.title}`,
    body: alert.description,
    android: {
      channelId,
      smallIcon: NOTIFICATION_CONFIG.androidSmallIcon,
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

export const showSyncNotification = async (
  title: string,
  body: string,
  progress?: number,
): Promise<string> => {
  return notifee.displayNotification({
    id: 'sync-notification',
    title,
    body,
    android: {
      channelId: 'sync',
      smallIcon: NOTIFICATION_CONFIG.androidSmallIcon,
      ongoing: progress !== undefined && progress < 100,
      progress: progress !== undefined ? { max: 100, current: progress } : undefined,
    },
  });
};

export const cancelNotification = async (id: string): Promise<void> => {
  await notifee.cancelNotification(id);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
};

// ============================================
// Badge Management
// ============================================

export const setBadgeCount = async (count: number): Promise<void> => {
  await notifee.setBadgeCount(count);
};

export const getBadgeCount = async (): Promise<number> => {
  return notifee.getBadgeCount();
};

export const incrementBadgeCount = async (): Promise<void> => {
  const current = await getBadgeCount();
  await setBadgeCount(current + 1);
};

export const decrementBadgeCount = async (): Promise<void> => {
  const current = await getBadgeCount();
  await setBadgeCount(Math.max(0, current - 1));
};
