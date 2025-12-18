# IntelGraph Mobile Native Apps

Native iOS and Android mobile applications for IntelGraph intelligence analysis platform built with React Native.

## Features

- **Native Performance**: Built with React Native for smooth, native performance on both iOS and Android
- **Offline-First**: Full offline capability with automatic sync when online
- **Location Tracking**: GPS tracking, geofencing, and location-based intelligence
- **Biometric Authentication**: Face ID, Touch ID, and fingerprint authentication
- **Push Notifications**: Real-time alerts and intelligence updates
- **Media Capture**: Camera, video, audio recording, and document scanning
- **Background Sync**: Automatic data synchronization in the background
- **OTA Updates**: Over-the-air updates without app store deployment

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### iOS Requirements

- macOS
- Xcode 14.0 or later
- iOS 13.0 or later
- CocoaPods 1.11.0 or later

### Android Requirements

- Android Studio Arctic Fox or later
- Android SDK 21 or later (Android 5.0+)
- JDK 11 or later

## Setup

### Install Dependencies

```bash
pnpm install
```

### iOS Setup

```bash
cd ios
pod install
cd ..
```

### Android Setup

No additional setup required. Gradle will download dependencies automatically.

### Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Required variables:
- `API_URL`: Backend API URL
- `GRAPHQL_URL`: GraphQL endpoint URL
- `WS_URL`: WebSocket URL for subscriptions
- `FIREBASE_API_KEY`: Firebase API key
- `GOOGLE_MAPS_API_KEY_IOS`: Google Maps API key for iOS
- `GOOGLE_MAPS_API_KEY_ANDROID`: Google Maps API key for Android
- `SENTRY_DSN`: Sentry error tracking DSN

## Development

### Start Metro Bundler

```bash
pnpm start
```

### Run on iOS

```bash
pnpm ios
```

Or open `ios/IntelGraph.xcworkspace` in Xcode and run from there.

### Run on Android

```bash
pnpm android
```

Or open the `android` folder in Android Studio and run from there.

## Building for Production

### iOS

```bash
# Build release version
pnpm ios:release

# Or use Expo EAS
pnpm build:ios
```

### Android

```bash
# Build APK
pnpm android:release

# Build AAB (for Play Store)
pnpm android:bundle

# Or use Expo EAS
pnpm build:android
```

## Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Over-the-Air (OTA) Updates

Deploy OTA updates using Expo EAS Update:

```bash
pnpm update:ota
```

## Project Structure

```
src/
├── components/        # Reusable components
├── screens/          # Screen components
├── navigation/       # Navigation configuration
├── services/         # Business logic and API services
├── hooks/            # Custom React hooks
├── contexts/         # React contexts
├── store/            # State management
├── utils/            # Utility functions
├── types/            # TypeScript types
├── theme/            # Theme configuration
├── config/           # App configuration
└── App.tsx           # Root component
```

## Key Services

- **AuthService**: Authentication, biometric login, MFA
- **GraphQLClient**: Apollo Client configuration with offline support
- **Database**: SQLite database for offline storage
- **OfflineSync**: Automatic data synchronization
- **LocationService**: GPS tracking and geofencing
- **MediaUpload**: File upload with background queue
- **NotificationService**: Push notifications and badges
- **BackgroundTasks**: Background data sync and location updates

## Architecture

### Offline-First

The app is built with an offline-first architecture:
- All data is cached locally in SQLite
- Mutations are queued when offline and synced when online
- Apollo Client cache persistence
- Background sync every 15 minutes
- Optimistic UI updates

### State Management

- **React Context**: Authentication, offline status, location
- **Zustand**: App-wide state management
- **Apollo Client**: GraphQL state and cache
- **React Query**: REST API state management

### Navigation

React Navigation with:
- Stack Navigator: Screen navigation
- Bottom Tab Navigator: Main app tabs
- Drawer Navigator: Side menu

## Performance Optimization

- Hermes JS engine for faster startup
- Code splitting and lazy loading
- Image optimization and caching
- React Native Reanimated for smooth animations
- MMKV for fast key-value storage
- SQLite for structured data

## Security

- Biometric authentication (Face ID, Touch ID, fingerprint)
- Secure credential storage with Keychain/Keystore
- Certificate pinning for API requests
- Encrypted local database
- Secure token management

## Monitoring and Analytics

- **Sentry**: Error tracking and crash reporting
- **Firebase Analytics**: User behavior analytics
- **Performance Monitoring**: FPS, network, and memory tracking

## Permissions

### iOS

- Camera: Photo and video capture
- Microphone: Audio recording
- Location: GPS tracking and geofencing
- Photos: Media library access
- Face ID: Biometric authentication
- Notifications: Push notifications

### Android

- Camera: Photo and video capture
- Microphone: Audio recording
- Location: GPS tracking and geofencing
- Storage: File access
- Biometric: Fingerprint authentication
- Notifications: Push notifications

## Deployment

### iOS App Store

1. Create app in App Store Connect
2. Configure certificates and provisioning profiles
3. Build release version: `pnpm build:ios`
4. Upload to App Store Connect
5. Submit for review

### Google Play Store

1. Create app in Google Play Console
2. Generate upload keystore
3. Build release AAB: `pnpm android:bundle`
4. Upload to Google Play Console
5. Submit for review

## Troubleshooting

### iOS Build Fails

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Fails

```bash
cd android
./gradlew clean
cd ..
```

### Metro Bundler Issues

```bash
pnpm clean
pnpm start --reset-cache
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
