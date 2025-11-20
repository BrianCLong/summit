# Mobile Development Guide

Comprehensive guide for developing mobile and cross-platform applications for IntelGraph.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [React Native Development](#react-native-development)
4. [PWA Development](#pwa-development)
5. [Electron Development](#electron-development)
6. [Offline-First Architecture](#offline-first-architecture)
7. [Authentication & Security](#authentication--security)
8. [Location Services](#location-services)
9. [Media Handling](#media-handling)
10. [Push Notifications](#push-notifications)
11. [Performance Optimization](#performance-optimization)
12. [Testing](#testing)
13. [Deployment](#deployment)

## Architecture Overview

IntelGraph's mobile strategy consists of three main platforms:

1. **React Native** (iOS & Android native apps)
2. **Progressive Web App** (PWA for web and installable apps)
3. **Electron** (Desktop apps for Windows, Mac, Linux)

### Shared Components

All platforms share common functionality through:
- **@intelgraph/mobile-sdk**: Shared utilities, offline sync, auth
- **GraphQL API**: Common data layer
- **Design System**: Consistent UI/UX

### Technology Stack

**React Native:**
- React 19.2+ with hooks
- TypeScript 5.9+
- React Navigation 7+
- Apollo Client 4+ for GraphQL
- React Query for REST APIs
- Zustand for state management

**PWA:**
- Next.js 16+ with App Router
- Service Workers with Workbox
- IndexedDB for offline storage
- Web APIs (geolocation, camera, etc.)

**Electron:**
- Electron 34+
- Vite for bundling
- Electron Store for persistence
- Auto-updater for updates

## Getting Started

### Prerequisites

```bash
# Required tools
node >= 18.0.0
pnpm >= 8.0.0

# Platform-specific
# iOS: Xcode 14+, CocoaPods
# Android: Android Studio, JDK 11+
# Desktop: Platform-specific build tools
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/intelgraph/summit.git
cd summit

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Running Development Servers

```bash
# React Native iOS
cd apps/mobile-native
pnpm ios

# React Native Android
pnpm android

# PWA
cd apps/mobile-interface
pnpm dev

# Electron
cd apps/desktop-electron
pnpm electron:dev
```

## React Native Development

### Project Structure

```
apps/mobile-native/
├── src/
│   ├── components/      # Reusable components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation config
│   ├── services/        # Business logic
│   ├── hooks/           # Custom hooks
│   ├── contexts/        # React contexts
│   ├── store/           # State management
│   ├── utils/           # Utilities
│   ├── theme/           # Design tokens
│   └── App.tsx          # Root component
├── ios/                 # iOS native code
├── android/             # Android native code
└── index.js            # Entry point
```

### Key Concepts

#### Navigation

We use React Navigation with a hybrid approach:

```typescript
// Stack navigation for linear flows
const Stack = createStackNavigator();

// Tab navigation for main app sections
const Tab = createBottomTabNavigator();

// Drawer navigation for settings/menu
const Drawer = createDrawerNavigator();
```

#### State Management

**Global State (Zustand):**
```typescript
import create from 'zustand';

export const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({user}),
}));
```

**Server State (Apollo Client):**
```typescript
const {data, loading, error} = useQuery(GET_ENTITIES);
```

#### Offline-First

All mutations are queued and synced:

```typescript
import {queueMutation} from './services/OfflineSync';

// Queue mutation when offline
await queueMutation('createEntity', {input});

// Automatically syncs when online
```

### Platform-Specific Code

```typescript
import {Platform} from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: Platform.select({
      ios: 16,
      android: 12,
      default: 16,
    }),
  },
});
```

### Native Modules

Access native features through bridges:

```typescript
// Biometric authentication
import ReactNativeBiometrics from 'react-native-biometrics';

const {success} = await rnBiometrics.simplePrompt({
  promptMessage: 'Authenticate',
});

// Location tracking
import Geolocation from 'react-native-geolocation-service';

Geolocation.getCurrentPosition(
  (position) => console.log(position),
  (error) => console.error(error),
  {enableHighAccuracy: true}
);
```

## PWA Development

### Service Worker Strategy

We use Workbox for advanced caching:

```javascript
// Cache-first for images
workbox.routing.registerRoute(
  /\.(png|jpg|jpeg|svg|gif)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Network-first for API
workbox.routing.registerRoute(
  /\/api\/.*/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 10,
  })
);
```

### Background Sync

Queue failed requests for retry:

```javascript
// Register background sync
const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin(
  'apiQueue',
  {
    maxRetentionTime: 24 * 60, // 24 hours
  }
);

workbox.routing.registerRoute(
  /\/api\/.*/,
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);
```

### IndexedDB Storage

Use our mobile SDK for storage:

```typescript
import {storeData, getData} from '@intelgraph/mobile-sdk/storage';

// Store entity
await storeData('entities', entityId, entityData, ttl);

// Retrieve entity
const entity = await getData('entities', entityId);
```

### Installability

```typescript
import {initializeBeforeInstallPrompt, showInstallPrompt} from '../lib/pwa-utils';

// Initialize
initializeBeforeInstallPrompt();

// Show prompt when user clicks install button
const accepted = await showInstallPrompt();
```

## Offline-First Architecture

### Design Principles

1. **Cache First**: Always serve from cache when available
2. **Background Sync**: Queue mutations for later execution
3. **Optimistic Updates**: Update UI immediately, rollback on error
4. **Differential Sync**: Only sync changes, not full datasets
5. **Conflict Resolution**: Last-write-wins with timestamps

### Implementation

**Queue Mutations:**
```typescript
import {queueMutation} from '@intelgraph/mobile-sdk/offline';

await queueMutation('createEntity', {
  name: 'New Entity',
  type: 'person',
});
```

**Sync Queue:**
```typescript
import {syncMutations} from '@intelgraph/mobile-sdk/offline';

await syncMutations(async (operation, variables) => {
  return await apolloClient.mutate({
    mutation: MUTATIONS[operation],
    variables,
  });
});
```

**Optimistic Updates:**
```typescript
const [createEntity] = useMutation(CREATE_ENTITY, {
  optimisticResponse: {
    createEntity: {
      __typename: 'Entity',
      id: 'temp-id',
      ...input,
    },
  },
  update(cache, {data}) {
    // Update cache optimistically
  },
});
```

### Data Synchronization

**Sync Status:**
```typescript
import {getSyncQueueStatus} from '@intelgraph/mobile-sdk/offline';

const status = await getSyncQueueStatus();
// {pending: 5, lastSync: timestamp, status: 'syncing'}
```

**Auto-sync:**
```typescript
import {enableAutoSync} from '@intelgraph/mobile-sdk/offline';

const cleanup = enableAutoSync(
  async (operation, variables) => {
    return await executeMutation(operation, variables);
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
  }
);

// Cleanup on unmount
return cleanup;
```

## Authentication & Security

### Biometric Authentication

**iOS (Face ID / Touch ID):**
```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

const {success} = await rnBiometrics.simplePrompt({
  promptMessage: 'Authenticate with biometrics',
});

if (success) {
  // Authentication successful
}
```

**Android (Fingerprint):**
```typescript
// Same API works on Android
const {success} = await rnBiometrics.simplePrompt({
  promptMessage: 'Scan fingerprint',
});
```

### Secure Storage

**React Native:**
```typescript
import * as Keychain from 'react-native-keychain';

// Store credentials
await Keychain.setGenericPassword(
  username,
  password,
  {service: 'intelgraph.auth'}
);

// Retrieve credentials
const credentials = await Keychain.getGenericPassword({
  service: 'intelgraph.auth',
});
```

**Web (PWA):**
```typescript
// Use Web Crypto API for encryption
const encrypted = await crypto.subtle.encrypt(
  {name: 'AES-GCM', iv},
  key,
  data
);

// Store in IndexedDB
await storeData('secure', 'token', encrypted);
```

### Token Management

```typescript
import {
  getAccessToken,
  setAccessToken,
  isTokenExpired,
  refreshAuthToken,
} from '@intelgraph/mobile-sdk/auth';

// Check and refresh token
const token = await getAccessToken();

if (token && isTokenExpired(token)) {
  const newToken = await refreshAuthToken();
  await setAccessToken(newToken);
}
```

## Location Services

### GPS Tracking

**Get Current Location:**
```typescript
import {getCurrentLocation} from './services/LocationService';

const location = await getCurrentLocation();
// {latitude, longitude, accuracy, timestamp}
```

**Watch Location:**
```typescript
import {watchLocation, clearLocationWatch} from './services/LocationService';

const watchId = watchLocation((location) => {
  console.log('Location updated:', location);
});

// Stop watching
clearLocationWatch(watchId);
```

### Background Location

```typescript
import {
  initializeBackgroundGeolocation,
  startBackgroundGeolocation,
} from './services/LocationService';

// Initialize
await initializeBackgroundGeolocation();

// Start tracking
await startBackgroundGeolocation();
```

### Geofencing

```typescript
import {addGeofence, removeGeofence} from './services/LocationService';

// Add geofence
await addGeofence(
  'headquarters',
  37.7749, // latitude
  -122.4194, // longitude
  100 // radius in meters
);

// Remove geofence
await removeGeofence('headquarters');
```

## Media Handling

### Camera Capture

**Photo:**
```typescript
import {launchCamera} from 'react-native-image-picker';

const result = await launchCamera({
  mediaType: 'photo',
  quality: 0.8,
});

if (result.assets) {
  const photo = result.assets[0];
  await uploadMedia(photo);
}
```

**Video:**
```typescript
const result = await launchCamera({
  mediaType: 'video',
  videoQuality: 'high',
  durationLimit: 60,
});
```

### Media Upload

```typescript
import {uploadMedia} from './services/MediaUpload';

const {id, url} = await uploadMedia(
  {
    uri: file.uri,
    type: 'photo',
    name: file.fileName,
    size: file.fileSize,
    mimeType: file.type,
  },
  {
    entityId: 'entity-123',
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    },
  }
);
```

### Background Upload Queue

```typescript
import {uploadQueuedMedia} from './services/MediaUpload';

// Upload queued media when online
await uploadQueuedMedia();
```

## Push Notifications

### Setup

**Register Device:**
```typescript
import {setupPushNotifications} from './services/NotificationService';

await setupPushNotifications();
```

**Get FCM Token:**
```typescript
import {getFCMToken} from './services/NotificationService';

const token = await getFCMToken();
// Send token to server
```

### Handle Notifications

**Foreground:**
```typescript
import messaging from '@react-native-firebase/messaging';

messaging().onMessage(async (remoteMessage) => {
  // Display notification
  await displayNotification(remoteMessage);
});
```

**Background:**
```typescript
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
});
```

### Local Notifications

```typescript
import {scheduleLocalNotification} from './services/NotificationService';

await scheduleLocalNotification(
  'Reminder',
  'Review case ABC',
  {caseId: 'abc'},
  new Date(Date.now() + 3600000) // 1 hour from now
);
```

## Performance Optimization

### Code Splitting

**React Native:**
```typescript
const LazyScreen = React.lazy(() => import('./screens/LazyScreen'));

<Suspense fallback={<LoadingScreen />}>
  <LazyScreen />
</Suspense>
```

**PWA (Next.js):**
```typescript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false,
});
```

### Image Optimization

**React Native:**
```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: imageUrl,
    priority: FastImage.priority.high,
  }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

**PWA:**
```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  width={400}
  height={300}
  alt="Description"
  loading="lazy"
/>
```

### Memoization

```typescript
import React, {useMemo, useCallback} from 'react';

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### List Virtualization

**React Native:**
```typescript
import {FlatList} from 'react-native';

<FlatList
  data={items}
  renderItem={({item}) => <ItemComponent item={item} />}
  keyExtractor={(item) => item.id}
  windowSize={10}
  maxToRenderPerBatch={10}
  removeClippedSubviews={true}
/>
```

## Testing

### Unit Tests

```typescript
import {render, fireEvent} from '@testing-library/react-native';

test('button handles press', () => {
  const handlePress = jest.fn();
  const {getByText} = render(
    <Button onPress={handlePress} title="Press me" />
  );

  fireEvent.press(getByText('Press me'));
  expect(handlePress).toHaveBeenCalled();
});
```

### Integration Tests

```typescript
import {mockServer} from './test-utils/mockServer';

test('fetches and displays entities', async () => {
  mockServer.use(
    rest.get('/api/entities', (req, res, ctx) => {
      return res(ctx.json([{id: '1', name: 'Test'}]));
    })
  );

  const {findByText} = render(<EntityList />);
  expect(await findByText('Test')).toBeTruthy();
});
```

### E2E Tests

**React Native (Detox):**
```typescript
describe('Authentication', () => {
  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('password');
    await element(by.id('login-button')).tap();

    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

## Deployment

### React Native

**iOS App Store:**
```bash
# Build release
cd ios
xcodebuild -workspace IntelGraph.xcworkspace \
  -scheme IntelGraph \
  -configuration Release \
  -archivePath build/IntelGraph.xcarchive \
  archive

# Upload to App Store Connect
xcrun altool --upload-app \
  -f IntelGraph.ipa \
  -u apple_id \
  -p app_specific_password
```

**Google Play Store:**
```bash
# Build AAB
cd android
./gradlew bundleRelease

# Upload to Play Console
# Use Play Console or fastlane
```

### PWA

```bash
# Build
cd apps/mobile-interface
pnpm build

# Deploy to hosting
# Vercel, Netlify, or your hosting provider
```

### Electron

```bash
# Build for all platforms
cd apps/desktop-electron
pnpm build

# Publish to GitHub Releases
pnpm electron:build --publish always
```

## Best Practices

1. **Always use TypeScript** for type safety
2. **Follow offline-first patterns** for better UX
3. **Implement proper error handling** and user feedback
4. **Optimize images and assets** before bundling
5. **Use code splitting** for large applications
6. **Write tests** for critical functionality
7. **Monitor performance** with profiling tools
8. **Keep dependencies updated** regularly
9. **Follow platform guidelines** (iOS HIG, Material Design)
10. **Implement analytics** for usage insights

## Resources

- [React Native Documentation](https://reactnative.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://electronjs.org/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [IntelGraph API Documentation](../api/README.md)

## Support

For questions or issues:
- GitHub Issues: https://github.com/intelgraph/summit/issues
- Slack: #mobile-dev
- Email: dev@intelgraph.com
