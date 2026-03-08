"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLocation = exports.getGeofences = exports.removeGeofence = exports.addGeofence = exports.stopBackgroundGeolocation = exports.startBackgroundGeolocation = exports.initializeBackgroundGeolocation = exports.clearLocationWatch = exports.watchLocation = exports.getCurrentLocation = exports.requestBackgroundLocationPermission = exports.requestLocationPermission = void 0;
const react_native_1 = require("react-native");
const react_native_geolocation_service_1 = __importDefault(require("react-native-geolocation-service"));
const react_native_background_geolocation_1 = __importDefault(require("react-native-background-geolocation"));
const Database_1 = require("./Database");
// Request location permission
const requestLocationPermission = async () => {
    try {
        if (react_native_1.Platform.OS === 'ios') {
            const auth = await react_native_geolocation_service_1.default.requestAuthorization('whenInUse');
            return auth === 'granted';
        }
        if (react_native_1.Platform.OS === 'android') {
            const granted = await react_native_1.PermissionsAndroid.requestMultiple([
                react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            return (granted['android.permission.ACCESS_FINE_LOCATION'] ===
                react_native_1.PermissionsAndroid.RESULTS.GRANTED ||
                granted['android.permission.ACCESS_COARSE_LOCATION'] ===
                    react_native_1.PermissionsAndroid.RESULTS.GRANTED);
        }
        return false;
    }
    catch (error) {
        console.error('Failed to request location permission:', error);
        return false;
    }
};
exports.requestLocationPermission = requestLocationPermission;
// Request background location permission
const requestBackgroundLocationPermission = async () => {
    try {
        if (react_native_1.Platform.OS === 'ios') {
            const auth = await react_native_geolocation_service_1.default.requestAuthorization('always');
            return auth === 'granted';
        }
        if (react_native_1.Platform.OS === 'android' && react_native_1.Platform.Version >= 29) {
            const granted = await react_native_1.PermissionsAndroid.request(react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
            return granted === react_native_1.PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    }
    catch (error) {
        console.error('Failed to request background location permission:', error);
        return false;
    }
};
exports.requestBackgroundLocationPermission = requestBackgroundLocationPermission;
// Get current location
const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        react_native_geolocation_service_1.default.getCurrentPosition((position) => {
            resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude || undefined,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed || undefined,
                heading: position.coords.heading || undefined,
                timestamp: position.timestamp,
            });
        }, (error) => {
            console.error('Failed to get current location:', error);
            reject(error);
        }, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
        });
    });
};
exports.getCurrentLocation = getCurrentLocation;
// Watch location changes
const watchLocation = (callback) => {
    return react_native_geolocation_service_1.default.watchPosition((position) => {
        callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            timestamp: position.timestamp,
        });
    }, (error) => {
        console.error('Location watch error:', error);
    }, {
        enableHighAccuracy: true,
        distanceFilter: 10, // Minimum distance (in meters) to trigger update
        interval: 5000, // Update interval (Android only)
        fastestInterval: 2000, // Fastest update interval (Android only)
    });
};
exports.watchLocation = watchLocation;
// Clear location watch
const clearLocationWatch = (watchId) => {
    react_native_geolocation_service_1.default.clearWatch(watchId);
};
exports.clearLocationWatch = clearLocationWatch;
// Initialize background geolocation
const initializeBackgroundGeolocation = async () => {
    try {
        await react_native_background_geolocation_1.default.ready({
            desiredAccuracy: react_native_background_geolocation_1.default.DESIRED_ACCURACY_HIGH,
            distanceFilter: 10,
            stopTimeout: 5,
            debug: false,
            logLevel: react_native_background_geolocation_1.default.LOG_LEVEL_VERBOSE,
            stopOnTerminate: false,
            startOnBoot: true,
            foregroundService: true,
            notification: {
                title: 'IntelGraph Location Tracking',
                text: 'Tracking location for intelligence gathering',
                color: '#2563eb',
                priority: react_native_background_geolocation_1.default.NOTIFICATION_PRIORITY_LOW,
            },
            enableHeadless: true,
        });
        // Location event listener
        react_native_background_geolocation_1.default.onLocation(async (location) => {
            console.log('[BackgroundGeolocation] Location:', location);
            const loc = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                altitude: location.coords.altitude,
                accuracy: location.coords.accuracy,
                speed: location.coords.speed,
                heading: location.coords.heading,
                timestamp: location.timestamp,
            };
            // Store location in local database
            await (0, Database_1.storeLocationUpdate)(loc);
        }, (error) => {
            console.error('[BackgroundGeolocation] Error:', error);
        });
        // Motion change event
        react_native_background_geolocation_1.default.onMotionChange((event) => {
            console.log('[BackgroundGeolocation] Motion change:', event.isMoving);
        });
        // Geofence event
        react_native_background_geolocation_1.default.onGeofence(async (geofence) => {
            console.log('[BackgroundGeolocation] Geofence:', geofence);
            // Handle geofence events
        });
        console.log('[BackgroundGeolocation] Initialized');
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Initialization failed:', error);
    }
};
exports.initializeBackgroundGeolocation = initializeBackgroundGeolocation;
// Start background geolocation
const startBackgroundGeolocation = async () => {
    try {
        const state = await react_native_background_geolocation_1.default.start();
        console.log('[BackgroundGeolocation] Started:', state.enabled);
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Start failed:', error);
    }
};
exports.startBackgroundGeolocation = startBackgroundGeolocation;
// Stop background geolocation
const stopBackgroundGeolocation = async () => {
    try {
        const state = await react_native_background_geolocation_1.default.stop();
        console.log('[BackgroundGeolocation] Stopped:', state.enabled);
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Stop failed:', error);
    }
};
exports.stopBackgroundGeolocation = stopBackgroundGeolocation;
// Add geofence
const addGeofence = async (identifier, latitude, longitude, radius) => {
    try {
        await react_native_background_geolocation_1.default.addGeofence({
            identifier,
            latitude,
            longitude,
            radius,
            notifyOnEntry: true,
            notifyOnExit: true,
            notifyOnDwell: false,
        });
        console.log('[BackgroundGeolocation] Geofence added:', identifier);
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Failed to add geofence:', error);
    }
};
exports.addGeofence = addGeofence;
// Remove geofence
const removeGeofence = async (identifier) => {
    try {
        await react_native_background_geolocation_1.default.removeGeofence(identifier);
        console.log('[BackgroundGeolocation] Geofence removed:', identifier);
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Failed to remove geofence:', error);
    }
};
exports.removeGeofence = removeGeofence;
// Get geofences
const getGeofences = async () => {
    try {
        const geofences = await react_native_background_geolocation_1.default.getGeofences();
        return geofences;
    }
    catch (error) {
        console.error('[BackgroundGeolocation] Failed to get geofences:', error);
        return [];
    }
};
exports.getGeofences = getGeofences;
// Update location (for background tasks)
const updateLocation = async () => {
    try {
        const location = await (0, exports.getCurrentLocation)();
        await (0, Database_1.storeLocationUpdate)(location);
    }
    catch (error) {
        console.error('Failed to update location:', error);
    }
};
exports.updateLocation = updateLocation;
