# Prompt #6: Offline Expedition Kit v1 - CRDT Merges + Signed Sync Logs

**Target**: Edge/Offline Q4 2025
**Owner**: Edge computing team
**Depends on**: Core GA, CRDT library, Electron

---

## Pre-Flight Checklist

```bash
# ✅ Check existing edge infrastructure
ls -la apps/desktop-electron/ 2>/dev/null || echo "Need to create Electron app"

# ✅ Verify CRDT library availability
npm search yjs automerge

# ✅ Check local storage options
ls -la services/*/src/storage/

# ✅ Test crypto for signing
node -e "const crypto = require('crypto'); console.log(crypto.getCiphers().includes('aes-256-gcm'))"
```

---

## Claude Prompt

```
You are implementing the Offline Expedition Kit v1 for IntelGraph - offline-first analytics with CRDT merges and signed sync logs.

CONTEXT:
- Stack: Electron + React, local storage (SQLite + embedded Neo4j or LevelDB), CRDTs (Yjs or Automerge)
- Existing: apps/desktop-electron/ may exist (check first)
- Use case: Field analysts with intermittent connectivity (48h+ offline)

REQUIREMENTS:
Build offline-first expedition kit with:

1. **Offline Tri-Pane UI** (Read-Only Analytics):
   - Graph pane: Local Neo4j or in-memory graph (cytoscape.js)
   - Timeline pane: Chronological events (local storage)
   - Map pane: Geospatial view (Leaflet.js with offline tiles)
   - Data: Synced before going offline (selective case download)
   - Analytics: Local query execution, no server calls

2. **Queued Edits (CRDT-Based)**:
   - User edits while offline: Add entity, update relationship, annotate
   - Store in CRDT document (Yjs or Automerge)
   - Operations: {type: 'addEntity', payload: {...}, timestamp, userId, signature}
   - Queue: Append-only log in SQLite
   - No conflicts: CRDT handles concurrent edits deterministically

3. **Reconnect & Merge**:
   - On reconnect: Sync CRDT state to server
   - Server merges: Local CRDT + Server CRDT → Merged state
   - Conflict resolution:
     - Automatic: CRDT handles most (LWW, counters, sets)
     - Manual: If semantic conflict (e.g., entity marked deleted + updated)
   - UI: apps/web/src/components/sync/ConflictResolver.tsx
   - Display: Side-by-side diff, accept/reject buttons

4. **Signed Sync Logs**:
   - Each sync: Generate signed log entry
   - Entry: {syncId, timestamp, deviceId, userId, changesHash, signature}
   - Signature: Ed25519 or ECDSA (asymmetric crypto)
   - Chain: Each log entry references previous (like blockchain)
   - Verification: Server validates signature chain before merge
   - Audit: Immutable record of all offline changes

5. **Selective Case Download**:
   - UI: Select case → Download for offline use
   - Package: Entities, relationships, evidence files, metadata
   - Format: SQLite database + files in local directory
   - Size limit: 1GB per case (warn user)
   - Encryption: AES-256-GCM for local storage (passphrase-based)

DELIVERABLES:

1. apps/edge/ (new Electron app)
   - main.ts: Electron main process
   - preload.ts: Secure IPC bridge
   - renderer/: React app (reuse apps/web/src/components/)
   - package.json: electron, electron-builder, yjs (or automerge)

2. apps/edge/src/storage/local-graph-db.ts
   - export class LocalGraphDB
   - Backend: SQLite + in-memory graph OR embedded Neo4j (if feasible)
   - Methods: queryGraph(cypher), addEntity(data), updateRelationship(data)

3. apps/edge/src/sync/crdt-manager.ts
   - export class CRDTManager
   - Use Yjs or Automerge for CRDT
   - Methods: applyEdit(operation), getState(), merge(remoteState)

4. apps/edge/src/sync/sync-queue.ts
   - export class SyncQueue
   - SQLite table: sync_queue (id, operation_type, payload, timestamp, synced)
   - Methods: enqueue(op), dequeueAll(), markSynced(id)

5. apps/edge/src/sync/signature-chain.ts
   - export class SignatureChain
   - Methods: signEntry(entry, privateKey), verifyChain(entries, publicKey)
   - Use: crypto.sign(), crypto.verify() (Node.js crypto or @noble/ed25519)

6. apps/edge/src/sync/conflict-resolver.ts
   - export class ConflictResolver
   - Methods: detectConflicts(local, remote), resolveAuto(conflict), needsManualReview(conflict)
   - Return: {autoResolved[], manualReview[]}

7. apps/web/src/components/sync/ConflictResolver.tsx
   - UI: Side-by-side diff (react-diff-viewer or custom)
   - Actions: Accept Local, Accept Remote, Merge Both, Skip
   - Show: Changed fields, timestamps, user attribution

8. server/src/sync/edge-sync-handler.ts
   - POST /api/sync/upload (from edge device)
   - Payload: {syncId, crdtState, signatureChain}
   - Validate: Signature chain, verify device is authorized
   - Merge: CRDT state into server database
   - Return: {conflicts[], mergeStatus, newSyncId}

9. apps/edge/src/ui/TriPaneOfflineView.tsx
   - Reuse: apps/web/src/components/tri-pane/EnhancedTriPaneView.tsx
   - Mode: Offline (disable server queries, show local data)
   - Banner: "Offline mode - 127 changes queued for sync"

10. apps/edge/src/download/case-packager.ts
    - Methods: downloadCase(caseId), packageForOffline(data)
    - Fetch: Entities, relationships, evidence files
    - Encrypt: AES-256-GCM with user passphrase
    - Store: ~/.intelgraph/offline-cases/{caseId}/

11. Tests:
    - apps/edge/tests/crdt.test.ts (CRDT merge determinism)
    - apps/edge/tests/signature-chain.test.ts (signature validation)
    - apps/edge/tests/sync.integration.test.ts (full offline→sync→merge flow)
    - Simulate: 48h offline editing, 100 changes, merge succeeds

ACCEPTANCE CRITERIA:
✅ Simulate 48h disconnected editing (100 operations)
✅ CRDT merge produces deterministic result (same merge on client & server)
✅ Signature chain validates (all entries signed, chain unbroken)
✅ Conflict resolver shows side-by-side diff for manual conflicts
✅ Offline analytics: Graph query executes locally in <500ms

TECHNICAL CONSTRAINTS:
- Electron: Use latest stable (v28+)
- CRDT: Yjs recommended (smaller bundle size, faster) OR Automerge (richer types)
- Signature: Use @noble/ed25519 (no native deps) or Node.js crypto
- Encryption: crypto.scrypt() for key derivation, crypto.createCipheriv() for AES-GCM
- Sync protocol: WebSocket (reconnect with exponential backoff)
- Local storage: SQLite (better-sqlite3 or sql.js)

SAMPLE CRDT OPERATION (Yjs):
```typescript
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const entities = ydoc.getMap('entities');

// Offline edit
entities.set('entity-123', {
  id: 'entity-123',
  name: 'Updated Name',
  updatedBy: 'user-456',
  timestamp: Date.now(),
});

// Serialize for sync
const state = Y.encodeStateAsUpdate(ydoc);

// On server: Merge
const serverDoc = new Y.Doc();
Y.applyUpdate(serverDoc, state);
```

SAMPLE SIGNATURE CHAIN:
```typescript
import { sign, verify } from '@noble/ed25519';

interface SyncLogEntry {
  syncId: string;
  timestamp: number;
  deviceId: string;
  userId: string;
  changesHash: string; // SHA-256 of CRDT state
  previousSyncId: string | null;
  signature: string; // Ed25519 signature
}

async function signEntry(entry: Omit<SyncLogEntry, 'signature'>, privateKey: Uint8Array): Promise<SyncLogEntry> {
  const message = JSON.stringify(entry);
  const signature = await sign(Buffer.from(message), privateKey);
  return { ...entry, signature: Buffer.from(signature).toString('hex') };
}

async function verifyChain(entries: SyncLogEntry[], publicKey: Uint8Array): Promise<boolean> {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { signature, ...rest } = entry;
    const message = JSON.stringify(rest);
    const valid = await verify(Buffer.from(signature, 'hex'), Buffer.from(message), publicKey);
    if (!valid) return false;

    // Check chain link
    if (i > 0 && entry.previousSyncId !== entries[i - 1].syncId) return false;
  }
  return true;
}
```

SAMPLE CONFLICT RESOLUTION UI (ConflictResolver.tsx):
```tsx
import React from 'react';
import ReactDiffViewer from 'react-diff-viewer';

interface Conflict {
  field: string;
  local: any;
  remote: any;
  localTimestamp: number;
  remoteTimestamp: number;
}

export function ConflictResolver({ conflicts, onResolve }: { conflicts: Conflict[], onResolve: (resolution: any) => void }) {
  return (
    <div>
      <h2>Conflicts Detected ({conflicts.length})</h2>
      {conflicts.map((conflict, i) => (
        <div key={i} style={{ border: '1px solid red', margin: '10px', padding: '10px' }}>
          <h3>Field: {conflict.field}</h3>
          <ReactDiffViewer
            oldValue={JSON.stringify(conflict.remote, null, 2)}
            newValue={JSON.stringify(conflict.local, null, 2)}
            splitView={true}
          />
          <p>Local: {new Date(conflict.localTimestamp).toISOString()}</p>
          <p>Remote: {new Date(conflict.remoteTimestamp).toISOString()}</p>
          <button onClick={() => onResolve({ index: i, choice: 'local' })}>Accept Local</button>
          <button onClick={() => onResolve({ index: i, choice: 'remote' })}>Accept Remote</button>
          <button onClick={() => onResolve({ index: i, choice: 'merge' })}>Merge Both</button>
        </div>
      ))}
    </div>
  );
}
```

ELECTRON SECURITY:
- Context isolation: true
- Node integration: false (use preload script)
- Sandbox: true
- CSP: Restrict inline scripts

OUTPUT:
Provide:
(a) Electron app structure (main, preload, renderer)
(b) CRDT manager (Yjs or Automerge)
(c) Sync queue + signature chain
(d) Conflict resolver UI
(e) Local storage (SQLite schema)
(f) Integration tests (offline→sync→merge)
(g) Packaging scripts (electron-builder config)
(h) User guide (how to use offline mode)
```

---

## Success Metrics

- [ ] 48h offline editing with 100+ changes merges successfully
- [ ] CRDT merge deterministic (same result on client & server)
- [ ] Signature chain validates (0 tampering detected in tests)
- [ ] Conflict resolver handles 10/10 test conflicts correctly
- [ ] Offline query performance <500ms p95

---

## Follow-Up Prompts

1. **P2P sync**: Sync between edge devices without server (libp2p or WebRTC)
2. **Partial sync**: Sync only changed subgraphs, not entire case
3. **Offline ML**: Run entity resolution locally with WASM model

---

## References

- Yjs: https://docs.yjs.dev/
- Automerge: https://automerge.org/docs/
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- @noble/ed25519: https://github.com/paulmillr/noble-ed25519
- SQLite: https://github.com/WiseLibs/better-sqlite3
