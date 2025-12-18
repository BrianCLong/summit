# Mobile Field Kit & On-Scene Capture

## Architecture

The Mobile Field Kit is an offline-first Progressive Web Application (PWA) designed for field operations in low-connectivity environments.

### Core Components

1.  **Local Data Store (`lib/storage.ts`)**:
    - Uses IndexedDB (via `idb` wrapper) for persistent storage of Cases, Notes, and Media on the client device.
    - Ensures data is available immediately without network access.
    - Data Model:
        - `FieldCaseSnapshot`: A subset of a case downloaded for a mission.
        - `FieldNote`: Textual observations linked to a case.
        - `FieldMediaCapture`: Photos/Videos/Audio (stored as Blobs).
        - `SyncQueue`: An operation log for changes made while offline.

2.  **Sync Engine (`lib/sync-engine.ts`)**:
    - Monitors network connectivity (`navigator.onLine`).
    - Queues mutations (`create`, `update`, `delete`) to IndexedDB when offline.
    - Replays the queue sequentially when connectivity is restored.
    - Handles conflict detection (Last-Write-Wins strategy for prototype, with planned divergence reporting).
    - Implements retry logic for flaky connections.

3.  **UI/UX**:
    - Built with React, Tailwind CSS, and Lucide Icons.
    - "Big Button" interface for high-stress/low-dexterity usage.
    - High contrast Dark Mode by default.
    - Minimal cognitive load workflows.

### Security & Privacy

- **Data Encryption**: Platform-level encryption (FileVault/BitLocker on laptops, iOS/Android encryption for mobile devices) is relied upon.
- **Session Management (`lib/security.ts`)**:
    - Implements a 15-minute inactivity timeout.
    - Locks the interface requiring a PIN (or re-auth) to resume.
    - Clears sensitive data from memory when locked (where possible).
- **Remote Wipe**:
    - The `SecurityManager` polls for a "kill pill" signal (simulated via local storage flag for now).
    - If received, the local IndexedDB is purged immediately and the application resets.

### Workflows

1.  **Preparation (Online)**:
    - User logs in and downloads `FieldCaseSnapshot` for assigned missions.
    - Relevant entities and watchlist items are cached locally.

2.  **Field Op (Offline/Intermittent)**:
    - User creates `FieldNote` and captures media.
    - **Tagging**: Users can tag specific Entities (Person, Location, etc.) from the case snapshot in their notes.
    - **Sensitivity**: Items can be marked GREEN, AMBER, or RED. RED items have additional visual warnings.
    - **License**: Content is tagged with USGOV, OSINT, or COMMERCIAL licenses.
    - All data is saved to IndexedDB.
    - Sync Queue records the intent.

3.  **Reconciliation (Online)**:
    - Device detects network.
    - Sync Engine flushes the queue to the IntelGraph API.
    - Server responds with canonical IDs and any conflict information.

### Development

- **Run Locally**: `npm run dev` inside `apps/field-kit`.
- **Test**: `npm test` runs Vitest for unit logic (Sync Queue, Models).

## Integration

The Field Kit integrates with the main IntelGraph platform via the `Ingestion Service` API.
- **Notes** -> Ingested as `Report` entities linked to the Case.
- **Media** -> Uploaded to Object Storage, metadata ingested as `Evidence` nodes.
