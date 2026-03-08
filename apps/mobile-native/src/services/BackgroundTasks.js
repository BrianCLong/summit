"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundFetchHeadlessTask = exports.registerBackgroundTasks = void 0;
const react_native_background_fetch_1 = __importDefault(require("react-native-background-fetch"));
const react_native_1 = require("react-native");
const OfflineSync_1 = require("./OfflineSync");
const MediaUpload_1 = require("./MediaUpload");
const LocationService_1 = require("./LocationService");
const GraphQLClient_1 = require("./GraphQLClient");
const SYNC_TASK_ID = 'com.intelgraph.sync';
const MEDIA_UPLOAD_TASK_ID = 'com.intelgraph.mediaupload';
const LOCATION_TASK_ID = 'com.intelgraph.location';
const CACHE_PERSIST_TASK_ID = 'com.intelgraph.cachepersist';
const registerBackgroundTasks = async () => {
    console.log('Registering background tasks...');
    try {
        // Configure BackgroundFetch
        const status = await react_native_background_fetch_1.default.configure({
            minimumFetchInterval: 15, // Minimum interval in minutes
            stopOnTerminate: false,
            enableHeadless: true,
            startOnBoot: true,
            requiredNetworkType: react_native_background_fetch_1.default.NETWORK_TYPE_ANY,
            requiresCharging: false,
            requiresDeviceIdle: false,
            requiresBatteryNotLow: false,
            requiresStorageNotLow: false,
        }, async (taskId) => {
            console.log('[BackgroundFetch] Task started:', taskId);
            try {
                switch (taskId) {
                    case SYNC_TASK_ID:
                        await (0, OfflineSync_1.syncOfflineData)();
                        break;
                    case MEDIA_UPLOAD_TASK_ID:
                        await (0, MediaUpload_1.uploadQueuedMedia)();
                        break;
                    case LOCATION_TASK_ID:
                        await (0, LocationService_1.updateLocation)();
                        break;
                    case CACHE_PERSIST_TASK_ID:
                        await (0, GraphQLClient_1.persistCache)();
                        break;
                    default:
                        // Default background sync
                        await (0, OfflineSync_1.syncOfflineData)();
                        await (0, MediaUpload_1.uploadQueuedMedia)();
                        await (0, GraphQLClient_1.persistCache)();
                        break;
                }
                react_native_background_fetch_1.default.finish(taskId);
            }
            catch (error) {
                console.error('[BackgroundFetch] Task failed:', error);
                react_native_background_fetch_1.default.finish(taskId);
            }
        }, (taskId) => {
            console.log('[BackgroundFetch] Task timeout:', taskId);
            react_native_background_fetch_1.default.finish(taskId);
        });
        console.log('[BackgroundFetch] Status:', status);
        // Schedule periodic sync task
        await react_native_background_fetch_1.default.scheduleTask({
            taskId: SYNC_TASK_ID,
            delay: 900000, // 15 minutes in milliseconds
            periodic: true,
            forceAlarmManager: react_native_1.Platform.OS === 'android',
            stopOnTerminate: false,
            enableHeadless: true,
            startOnBoot: true,
        });
        // Schedule media upload task
        await react_native_background_fetch_1.default.scheduleTask({
            taskId: MEDIA_UPLOAD_TASK_ID,
            delay: 1800000, // 30 minutes
            periodic: true,
            forceAlarmManager: react_native_1.Platform.OS === 'android',
            stopOnTerminate: false,
            enableHeadless: true,
            requiredNetworkType: react_native_background_fetch_1.default.NETWORK_TYPE_UNMETERED,
        });
        // Schedule cache persist task
        await react_native_background_fetch_1.default.scheduleTask({
            taskId: CACHE_PERSIST_TASK_ID,
            delay: 300000, // 5 minutes
            periodic: true,
            forceAlarmManager: react_native_1.Platform.OS === 'android',
            stopOnTerminate: false,
            enableHeadless: true,
        });
        console.log('Background tasks registered successfully');
    }
    catch (error) {
        console.error('Failed to register background tasks:', error);
    }
};
exports.registerBackgroundTasks = registerBackgroundTasks;
// Headless task for Android
const BackgroundFetchHeadlessTask = async (event) => {
    const taskId = event.taskId;
    const isTimeout = event.timeout;
    if (isTimeout) {
        console.log('[BackgroundFetch] Headless TIMEOUT:', taskId);
        react_native_background_fetch_1.default.finish(taskId);
        return;
    }
    console.log('[BackgroundFetch] Headless task started:', taskId);
    try {
        await (0, OfflineSync_1.syncOfflineData)();
        await (0, MediaUpload_1.uploadQueuedMedia)();
        await (0, GraphQLClient_1.persistCache)();
    }
    catch (error) {
        console.error('[BackgroundFetch] Headless task failed:', error);
    }
    react_native_background_fetch_1.default.finish(taskId);
};
exports.BackgroundFetchHeadlessTask = BackgroundFetchHeadlessTask;
// Register headless task for Android
if (react_native_1.Platform.OS === 'android') {
    react_native_background_fetch_1.default.registerHeadlessTask(exports.BackgroundFetchHeadlessTask);
}
