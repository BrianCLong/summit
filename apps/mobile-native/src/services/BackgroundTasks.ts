import BackgroundFetch from 'react-native-background-fetch';
import {Platform} from 'react-native';

import {syncOfflineData} from './OfflineSync';
import {uploadQueuedMedia} from './MediaUpload';
import {updateLocation} from './LocationService';
import {persistCache} from './GraphQLClient';

const SYNC_TASK_ID = 'com.intelgraph.sync';
const MEDIA_UPLOAD_TASK_ID = 'com.intelgraph.mediaupload';
const LOCATION_TASK_ID = 'com.intelgraph.location';
const CACHE_PERSIST_TASK_ID = 'com.intelgraph.cachepersist';

export const registerBackgroundTasks = async () => {
  console.log('Registering background tasks...');

  try {
    // Configure BackgroundFetch
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // Minimum interval in minutes
        stopOnTerminate: false,
        enableHeadless: true,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        requiresCharging: false,
        requiresDeviceIdle: false,
        requiresBatteryNotLow: false,
        requiresStorageNotLow: false,
      },
      async (taskId) => {
        console.log('[BackgroundFetch] Task started:', taskId);

        try {
          switch (taskId) {
            case SYNC_TASK_ID:
              await syncOfflineData();
              break;
            case MEDIA_UPLOAD_TASK_ID:
              await uploadQueuedMedia();
              break;
            case LOCATION_TASK_ID:
              await updateLocation();
              break;
            case CACHE_PERSIST_TASK_ID:
              await persistCache();
              break;
            default:
              // Default background sync
              await syncOfflineData();
              await uploadQueuedMedia();
              await persistCache();
              break;
          }

          BackgroundFetch.finish(taskId);
        } catch (error) {
          console.error('[BackgroundFetch] Task failed:', error);
          BackgroundFetch.finish(taskId);
        }
      },
      (taskId) => {
        console.log('[BackgroundFetch] Task timeout:', taskId);
        BackgroundFetch.finish(taskId);
      },
    );

    console.log('[BackgroundFetch] Status:', status);

    // Schedule periodic sync task
    await BackgroundFetch.scheduleTask({
      taskId: SYNC_TASK_ID,
      delay: 900000, // 15 minutes in milliseconds
      periodic: true,
      forceAlarmManager: Platform.OS === 'android',
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
    });

    // Schedule media upload task
    await BackgroundFetch.scheduleTask({
      taskId: MEDIA_UPLOAD_TASK_ID,
      delay: 1800000, // 30 minutes
      periodic: true,
      forceAlarmManager: Platform.OS === 'android',
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_UNMETERED,
    });

    // Schedule cache persist task
    await BackgroundFetch.scheduleTask({
      taskId: CACHE_PERSIST_TASK_ID,
      delay: 300000, // 5 minutes
      periodic: true,
      forceAlarmManager: Platform.OS === 'android',
      stopOnTerminate: false,
      enableHeadless: true,
    });

    console.log('Background tasks registered successfully');
  } catch (error) {
    console.error('Failed to register background tasks:', error);
  }
};

// Headless task for Android
export const BackgroundFetchHeadlessTask = async (event: any) => {
  const taskId = event.taskId;
  const isTimeout = event.timeout;

  if (isTimeout) {
    console.log('[BackgroundFetch] Headless TIMEOUT:', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }

  console.log('[BackgroundFetch] Headless task started:', taskId);

  try {
    await syncOfflineData();
    await uploadQueuedMedia();
    await persistCache();
  } catch (error) {
    console.error('[BackgroundFetch] Headless task failed:', error);
  }

  BackgroundFetch.finish(taskId);
};

// Register headless task for Android
if (Platform.OS === 'android') {
  BackgroundFetch.registerHeadlessTask(BackgroundFetchHeadlessTask);
}
