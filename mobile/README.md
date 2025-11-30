# Summit Intelligence Mobile (Expo / React Native)

Enterprise-grade offline-first mobile client for field intelligence with biometric access, encrypted storage, clustered map views, background sync, push notifications, camera capture, voice dictation, and secure document handling. Designed for production parity across iOS and Android with Expo-managed workflows.

## Architecture Overview

- **App Shell**: Expo (SDK 51) with React Navigation stack. Entry in `App.tsx` wraps biometric gate and sync provider with navigation to all surfaces.
- **Security**: Biometric auth (`expo-local-authentication`), encrypted document index (`expo-secure-store`), OS-level permissions for camera/location/microphone, and push registration gated behind authentication.
- **Offline-first**: SQLite queue (`SyncProvider` + `offlineStore`) buffers outbound mutations, background sync via `expo-background-fetch` + `expo-task-manager`, durable storage for documents/imagery/audio under `FileSystem.documentDirectory`.
- **Observability hooks**: Sync provider surfaces queue depth, status, and last sync timestamp; enqueue path centralizes telemetry payloads for server ingestion.
- **UX modules**:
  - `DashboardScreen` renders clustered map intelligence across geos, surfaces sync status, and lets users trigger manual sync.
  - `CaptureScreen` captures imagery with Expo Camera, saves to disk, stages for sync, and reports queue depth.
  - `DocumentsScreen` loads secure metadata, writes documents to encrypted store, and tracks open events.
  - `VoiceNotesScreen` records audio for dictation workflows and sync queuing.
- **Extendability**: Module resolution aliases (`@/`) for clean imports; Expo plugins configured for biometrics, notifications, background tasks, camera, SQLite, and network awareness.

## Key Files

- `App.tsx` — navigation shell and providers.
- `src/components/AuthGate.tsx` — biometric gate + push registration.
- `src/services/SyncProvider.tsx` — offline queue, SQLite schema, background sync registration.
- `src/screens/*` — feature surfaces (dashboard, capture, documents, voice dictation).
- `app.config.ts` — platform permissions, bundle identifiers, plugin activation.

## Running Locally

```bash
cd mobile
npm install
npm run start # or npm run ios / android
npm test # unit tests
```

Expo credentials or EAS project IDs can be layered via `app.config.ts` `extra` fields. Replace the placeholder `projectId` with your EAS value for production builds.

## Production Hardening Checklist

- Wire `sendPayload` in `SyncProvider` to authenticated GraphQL/REST endpoints with mTLS.
- Add remote feature flagging (e.g., LaunchDarkly) for AR overlays and advanced analytics.
- Pin notification channels and categories per platform for operational alerts.
- Enforce device integrity (Jailbreak/Root detection) before unlocking the app shell.
- Add runtime logging/tracing bridge (OpenTelemetry) and Sentry crash reporting.
- Implement AR overlay for field intelligence via `expo-three` and geofenced anchoring.
- Integrate voice-to-text service for dictation (e.g., Whisper endpoint) with encrypted transit.
- Expand document DRM using secure viewer and watermarking APIs.
