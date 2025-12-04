import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Summit Intelligence',
  slug: 'summit-intelligence',
  version: '1.0.0',
  scheme: 'summitintel',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.summit.intelligence',
    infoPlist: {
      NSCameraUsageDescription: 'Capture field intelligence and attach to reports.',
      NSLocationWhenInUseUsageDescription: 'Provide precise geolocation for field activities.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Support background sync and geo-fencing.',
      NSFaceIDUsageDescription: 'Enable biometric authentication for secure access.',
      NSPhotoLibraryUsageDescription: 'Allow saving captured imagery to the device.',
      NSMicrophoneUsageDescription: 'Record voice dictations for offline transcription.'
    }
  },
  android: {
    package: 'com.summit.intelligence',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    permissions: [
      'CAMERA',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'RECORD_AUDIO',
      'WRITE_EXTERNAL_STORAGE'
    ]
  },
  plugins: [
    'expo-local-authentication',
    'expo-notifications',
    'expo-task-manager',
    'expo-camera',
    'expo-sqlite'
  ],
  extra: {
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000'
    }
  }
};

export default config;
