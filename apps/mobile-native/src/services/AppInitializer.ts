import {Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';

import {restoreCache} from './GraphQLClient';
import {SENTRY_DSN, SENTRY_ENV, ENABLE_PUSH_NOTIFICATIONS} from '../config';
import {initializeDatabase} from './Database';
import {registerBackgroundTasks} from './BackgroundTasks';
import {requestLocationPermission} from './LocationService';
import {setupPushNotifications} from './NotificationService';

export const initializeApp = async () => {
  console.log('Initializing app...');

  // Initialize Sentry for error tracking
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENV,
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
  if (Platform.OS !== 'web') {
    await analytics().setAnalyticsCollectionEnabled(true);
  }

  // Check network connectivity
  const networkState = await NetInfo.fetch();
  console.log('Network state:', networkState);

  // Initialize local database
  await initializeDatabase();

  // Restore Apollo cache
  await restoreCache();

  // Request location permission (for location-based features)
  await requestLocationPermission();

  // Setup push notifications
  if (ENABLE_PUSH_NOTIFICATIONS) {
    await setupPushNotifications();
  }

  // Register background tasks
  await registerBackgroundTasks();

  // Request notification permission
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');
    }
  }

  console.log('App initialized successfully');
};
