# IntelGraph Mobile

React Native OSINT mobile application for Summit IntelGraph with offline-first architecture, real-time GraphQL subscriptions, and GEOINT visualization.

## Features

- **Offline-First Architecture**: Full functionality without network connectivity with automatic sync
- **Real-Time OSINT Dashboards**: GraphQL subscriptions for live intelligence updates
- **GEOINT Visualization**: Interactive maps with entity clustering and layer management
- **Push Notifications**: Critical alert notifications with priority-based channels
- **Secure Authentication**: Biometric login, PIN protection, and CAC/PIV card support
- **Edge Sync**: Background synchronization with conflict resolution

## Tech Stack

- **React Native** 0.76+ with TypeScript
- **NativeWind** (Tailwind CSS for React Native)
- **Apollo Client** with GraphQL subscriptions
- **Zustand** for state management
- **React Query** for data fetching
- **Mapbox GL** for GEOINT visualization
- **MMKV** for fast local storage
- **Notifee** + Firebase for push notifications

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.12.0
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Installation

```bash
# From the monorepo root
pnpm install

# Navigate to mobile app
cd apps/mobile

# Install iOS dependencies
pnpm pod-install

# Start Metro bundler
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Environment Configuration

Create a `.env` file in the `apps/mobile` directory:

```env
API_URL=https://api.intelgraph.io
GRAPHQL_URL=https://api.intelgraph.io/graphql
WS_URL=wss://api.intelgraph.io/graphql
MAPBOX_ACCESS_TOKEN=your_mapbox_token
FIREBASE_VAPID_KEY=your_firebase_vapid_key
```

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn-native style components
│   │   └── geoint/      # GEOINT-specific components
│   ├── screens/         # Screen components
│   ├── navigation/      # React Navigation setup
│   ├── services/        # Business logic services
│   │   ├── AuthService.ts
│   │   ├── GraphQLClient.ts
│   │   ├── SyncService.ts
│   │   ├── DatabaseService.ts
│   │   ├── NotificationService.ts
│   │   └── OfflineQueueService.ts
│   ├── stores/          # Zustand state stores
│   ├── graphql/         # GraphQL operations and hooks
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── config/          # App configuration
│   └── assets/          # Static assets
├── __tests__/           # Test files
├── android/             # Android native code
├── ios/                 # iOS native code
└── package.json
```

## Key Features

### Offline-First Architecture

The app is designed to work fully offline with automatic synchronization:

```typescript
// Mutations are automatically queued when offline
const { createEntity } = useCreateEntity();
await createEntity(entityData); // Works offline, syncs when online

// Check sync status
const { syncStatus } = useAppStore();
console.log(syncStatus.pendingChanges); // Number of pending changes
```

### Real-Time Updates

GraphQL subscriptions provide live updates:

```typescript
// Automatic subscription to entity changes
const { entities } = useEntities();
// entities automatically update when new data arrives

// Manual subscription
const { data } = useSubscription(ALERT_CREATED_SUBSCRIPTION);
```

### GEOINT Visualization

Interactive maps with entity clustering:

```tsx
import { GEOINTMap } from '@/components/geoint';

<GEOINTMap
  onFeaturePress={(feature) => console.log(feature)}
  showControls={true}
  showLayers={true}
/>
```

### Push Notifications

Priority-based notification channels:

```typescript
import { showAlertNotification } from '@/services/NotificationService';

await showAlertNotification({
  id: 'alert-1',
  title: 'Critical Alert',
  description: 'New threat detected',
  priority: 'CRITICAL',
  // ...
});
```

## Component Library

The app includes shadcn-native inspired components:

- `Button` - Various button styles and states
- `Card` - Container component with variants
- `Badge` - Status indicators (Priority, Classification, EntityType)
- `Input` - Form inputs with validation
- `Modal` / `BottomSheet` - Overlay components
- `Toast` - Notification toasts
- `Skeleton` - Loading placeholders
- And more...

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Building for Production

### iOS

```bash
# Using EAS Build
pnpm build:ios

# Local build
cd ios && xcodebuild -workspace IntelGraphMobile.xcworkspace -scheme IntelGraphMobile -configuration Release
```

### Android

```bash
# Using EAS Build
pnpm build:android

# Local APK
pnpm android:release

# Local AAB (for Play Store)
pnpm android:bundle
```

## Security Considerations

- All API communication uses HTTPS
- Tokens stored in secure Keychain/Keystore
- Biometric authentication supported
- Classification banners displayed appropriately
- Offline data encrypted at rest
- Audit logging for sensitive operations

## Contributing

1. Create a feature branch from `main`
2. Make changes following the code style guide
3. Add tests for new functionality
4. Run `pnpm lint && pnpm typecheck && pnpm test`
5. Submit a pull request

## License

MIT - See LICENSE file for details.
