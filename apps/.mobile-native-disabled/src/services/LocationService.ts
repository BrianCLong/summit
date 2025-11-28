import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundGeolocation from 'react-native-background-geolocation';

import {storeLocationUpdate} from './Database';

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

// Request location permission
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      return (
        granted['android.permission.ACCESS_FINE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.ACCESS_COARSE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }

    return false;
  } catch (error) {
    console.error('Failed to request location permission:', error);
    return false;
  }
};

// Request background location permission
export const requestBackgroundLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('always');
      return auth === 'granted';
    }

    if (Platform.OS === 'android' && Platform.Version >= 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  } catch (error) {
    console.error('Failed to request background location permission:', error);
    return false;
  }
};

// Get current location
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude || undefined,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.error('Failed to get current location:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
};

// Watch location changes
export const watchLocation = (callback: (location: Location) => void): number => {
  return Geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude || undefined,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      console.error('Location watch error:', error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10, // Minimum distance (in meters) to trigger update
      interval: 5000, // Update interval (Android only)
      fastestInterval: 2000, // Fastest update interval (Android only)
    },
  );
};

// Clear location watch
export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};

// Initialize background geolocation
export const initializeBackgroundGeolocation = async (): Promise<void> => {
  try {
    await BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10,
      stopTimeout: 5,
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      stopOnTerminate: false,
      startOnBoot: true,
      foregroundService: true,
      notification: {
        title: 'IntelGraph Location Tracking',
        text: 'Tracking location for intelligence gathering',
        color: '#2563eb',
        priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
      },
      enableHeadless: true,
    });

    // Location event listener
    BackgroundGeolocation.onLocation(
      async (location) => {
        console.log('[BackgroundGeolocation] Location:', location);

        const loc: Location = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          speed: location.coords.speed,
          heading: location.coords.heading,
          timestamp: location.timestamp,
        };

        // Store location in local database
        await storeLocationUpdate(loc);
      },
      (error) => {
        console.error('[BackgroundGeolocation] Error:', error);
      },
    );

    // Motion change event
    BackgroundGeolocation.onMotionChange((event) => {
      console.log('[BackgroundGeolocation] Motion change:', event.isMoving);
    });

    // Geofence event
    BackgroundGeolocation.onGeofence(async (geofence) => {
      console.log('[BackgroundGeolocation] Geofence:', geofence);
      // Handle geofence events
    });

    console.log('[BackgroundGeolocation] Initialized');
  } catch (error) {
    console.error('[BackgroundGeolocation] Initialization failed:', error);
  }
};

// Start background geolocation
export const startBackgroundGeolocation = async (): Promise<void> => {
  try {
    const state = await BackgroundGeolocation.start();
    console.log('[BackgroundGeolocation] Started:', state.enabled);
  } catch (error) {
    console.error('[BackgroundGeolocation] Start failed:', error);
  }
};

// Stop background geolocation
export const stopBackgroundGeolocation = async (): Promise<void> => {
  try {
    const state = await BackgroundGeolocation.stop();
    console.log('[BackgroundGeolocation] Stopped:', state.enabled);
  } catch (error) {
    console.error('[BackgroundGeolocation] Stop failed:', error);
  }
};

// Add geofence
export const addGeofence = async (
  identifier: string,
  latitude: number,
  longitude: number,
  radius: number,
): Promise<void> => {
  try {
    await BackgroundGeolocation.addGeofence({
      identifier,
      latitude,
      longitude,
      radius,
      notifyOnEntry: true,
      notifyOnExit: true,
      notifyOnDwell: false,
    });
    console.log('[BackgroundGeolocation] Geofence added:', identifier);
  } catch (error) {
    console.error('[BackgroundGeolocation] Failed to add geofence:', error);
  }
};

// Remove geofence
export const removeGeofence = async (identifier: string): Promise<void> => {
  try {
    await BackgroundGeolocation.removeGeofence(identifier);
    console.log('[BackgroundGeolocation] Geofence removed:', identifier);
  } catch (error) {
    console.error('[BackgroundGeolocation] Failed to remove geofence:', error);
  }
};

// Get geofences
export const getGeofences = async (): Promise<any[]> => {
  try {
    const geofences = await BackgroundGeolocation.getGeofences();
    return geofences;
  } catch (error) {
    console.error('[BackgroundGeolocation] Failed to get geofences:', error);
    return [];
  }
};

// Update location (for background tasks)
export const updateLocation = async (): Promise<void> => {
  try {
    const location = await getCurrentLocation();
    await storeLocationUpdate(location);
  } catch (error) {
    console.error('Failed to update location:', error);
  }
};
