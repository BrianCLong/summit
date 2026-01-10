---
id: EDGE-001
name: Edge/Offline Expedition Kit with CRDT Resync
slug: offline-expedition-kit
category: ops
subcategory: edge-computing
priority: medium
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Delivers an offline case room with local tri-pane (graph/timeline/map), local
  provenance wallet, and CRDT-based merge on reconnect. Supports air-gapped operations
  with signed resync logs.

objective: |
  Enable analysts to work offline in the field with full graph/temporal/geospatial
  capabilities, then sync back to central infrastructure with conflict resolution.

tags:
  - offline
  - edge-computing
  - crdt
  - sync
  - air-gapped
  - provenance

dependencies:
  services:
    - neo4j
    - postgresql
  packages:
    - "@intelgraph/graph"
    - "@intelgraph/prov-ledger"
  external:
    - "automerge@^2.0.0"
    - "y-crdt@^1.0.0"
    - "pouchdb@^8.0.0"

deliverables:
  - type: package
    description: Offline-capable React application
  - type: service
    description: Mesh relay and resync coordinator
  - type: tests
    description: Conflict resolution test suite
  - type: documentation
    description: Air-gapped deployment guide

acceptance_criteria:
  - description: Offline mode works without network
    validation: Disconnect network, verify full CRUD operations
  - description: Resync merges conflicting edits correctly
    validation: Two offline clients edit same entity, verify CRDT merge
  - description: Provenance chain maintained across sync
    validation: Check provenance ledger includes offline ops
  - description: Divergence report generated
    validation: Verify report shows conflicts and resolutions

estimated_effort: 7-10 days
complexity: high

related_prompts:
  - DQ-001
  - GOV-002

blueprint_path: ../blueprints/templates/service
---

# Edge/Offline Expedition Kit with CRDT Resync

## Objective

Enable intelligence analysts to operate fully offline in disconnected environments (field operations, air-gapped facilities) with complete access to graph analytics, timelines, and geospatial views. On reconnection, the system must automatically merge changes using Conflict-free Replicated Data Types (CRDTs), produce a divergence report, and maintain provenance integrity.

## Prompt

**Deliver an offline case room: local tri-pane (graph/timeline/map), local provenance wallet, and CRDT-based merge on reconnect. Generate a divergence report and signed resync log. Include a 'mesh relay' stub and an 'air-gapped update train' packager.**

### Core Requirements

**(a) Local Tri-Pane Interface**

Build offline-capable UI with three synchronized panes:

1. **Graph Pane** (Neo4j-compatible local storage)
   - Cypher query execution against local graph
   - Entity/relationship visualization
   - CRUD operations with local-first persistence

2. **Timeline Pane** (Temporal analysis)
   - Event timeline with date range filters
   - Temporal patterns detection
   - Animated playback of events

3. **Map Pane** (Geospatial)
   - Leaflet/Mapbox GL offline tile support
   - Entity location plotting
   - Geofencing and spatial queries

All panes must:
- Work without network connectivity
- Sync state bidirectionally (e.g., click entity in graph → highlight on map)
- Support undo/redo with local operation log

**(b) Local Provenance Wallet**

Implement client-side provenance ledger:

```typescript
interface ProvenanceWallet {
  // Record all local operations
  recordOperation(op: Operation): Promise<ProvenanceEntry>;

  // Sign operations with client key
  signEntry(entry: ProvenanceEntry): Promise<SignedEntry>;

  // Export provenance chain for sync
  exportChain(): Promise<ProvenanceChain>;

  // Merge remote provenance on resync
  mergeRemoteChain(remote: ProvenanceChain): Promise<MergeResult>;
}

interface Operation {
  type: 'create' | 'update' | 'delete' | 'query';
  entityType: string;
  entityId: string;
  payload: any;
  timestamp: number;
  clientId: string;
}

interface ProvenanceEntry {
  id: string;
  operation: Operation;
  actor: string;        // User ID
  device: string;       // Device fingerprint
  location?: GeoPoint;  // GPS coords if available
  parentEntries: string[];  // Chain linkage
  hash: string;         // SHA-256 of operation + parents
}
```

Store in PouchDB for offline persistence and built-in sync.

**(c) CRDT-Based Merge on Reconnect**

Use Automerge or Yjs for CRDT implementation:

**Entity Model (CRDT-aware)**:
```typescript
import * as Automerge from '@automerge/automerge';

interface Entity {
  id: string;
  name: string;          // LWW (Last-Write-Wins) register
  type: string;          // LWW
  attributes: {          // Map CRDT
    [key: string]: any;
  };
  tags: string[];        // OR-Set (add-only, removals resolved)
  relationships: string[]; // OR-Set
  _meta: {
    created: number;
    updated: number;
    updatedBy: string;
  };
}

// Initialize CRDT document
const doc = Automerge.init<{ entities: Entity[] }>();

// Offline edits on client A
const docA = Automerge.change(doc, (doc) => {
  doc.entities[0].name = "Updated Name A";
  doc.entities[0].tags.push("field-verified");
});

// Offline edits on client B
const docB = Automerge.change(doc, (doc) => {
  doc.entities[0].name = "Updated Name B";
  doc.entities[0].attributes.status = "confirmed";
});

// On reconnect, merge
const merged = Automerge.merge(docA, docB);
// Result: name = "Updated Name B" (LWW by timestamp)
//         tags = ["field-verified"] (OR-Set)
//         attributes.status = "confirmed"
```

**(d) Divergence Report Generation**

After resync, produce a human-readable report:

```json
{
  "syncId": "sync-2025-11-29-xyz",
  "clientId": "field-laptop-42",
  "syncedAt": "2025-11-29T14:30:00Z",
  "summary": {
    "totalOperations": 127,
    "conflicts": 3,
    "autoResolved": 2,
    "manualReviewRequired": 1
  },
  "conflicts": [
    {
      "entityId": "e-456",
      "field": "name",
      "localValue": "Suspect A (field note)",
      "remoteValue": "Suspect A (HQ correction)",
      "resolution": "remote_wins",
      "reason": "Remote update more recent (LWW)"
    },
    {
      "entityId": "e-789",
      "field": "relationships",
      "localValue": ["r-1", "r-2"],
      "remoteValue": ["r-1", "r-3"],
      "resolution": "merged",
      "mergedValue": ["r-1", "r-2", "r-3"],
      "reason": "OR-Set union"
    },
    {
      "entityId": "e-999",
      "field": "classification",
      "localValue": "CONFIDENTIAL",
      "remoteValue": "SECRET",
      "resolution": "manual_review",
      "reason": "Classification conflicts require analyst review"
    }
  ]
}
```

**(e) Signed Resync Log**

All sync operations must be signed and auditable:

```typescript
interface ResyncLog {
  syncId: string;
  clientId: string;
  syncedAt: string;
  operations: Operation[];
  conflicts: Conflict[];
  provenanceChain: ProvenanceChain;
  signature: string;  // Ed25519 signature over hash(operations + conflicts + provenance)
}

// Sign log
function signResyncLog(log: ResyncLog, privateKey: CryptoKey): Promise<string> {
  const payload = JSON.stringify({
    syncId: log.syncId,
    operations: log.operations,
    conflicts: log.conflicts,
    provenanceChain: log.provenanceChain
  });
  return crypto.subtle.sign('Ed25519', privateKey, Buffer.from(payload));
}
```

**(f) Mesh Relay Stub**

For intermittent connectivity, implement peer-to-peer sync:

```typescript
interface MeshRelay {
  // Discover peers via local network (mDNS/BLE)
  discoverPeers(): Promise<Peer[]>;

  // Sync with peer (no central server)
  syncWithPeer(peerId: string): Promise<SyncResult>;

  // Forward updates to next hop
  relayUpdate(update: Update, nextHop: string): Promise<void>;
}

// Usage: In field with no central connectivity, analysts can sync laptop-to-laptop
// forming a mesh network that eventually syncs back to HQ when any node reconnects
```

**(g) Air-Gapped Update Train Packager**

For fully air-gapped environments, generate portable update bundles:

```bash
# CLI: Package updates for sneakernet transport
offline-kit package-updates \
  --from sync-checkpoint-001 \
  --to sync-checkpoint-002 \
  --output updates-bundle.enc \
  --encrypt-with pubkey.pem

# Output: updates-bundle.enc (encrypted, signed bundle)
#         - CRDT state deltas
#         - Provenance chains
#         - Verification signatures
#         - Manifest with checksums

# On air-gapped system:
offline-kit apply-updates \
  --bundle updates-bundle.enc \
  --decrypt-with privkey.pem \
  --verify-with ca-cert.pem
```

### Technical Specifications

**Application Structure**:
```
packages/offline-kit/
├── src/
│   ├── ui/
│   │   ├── GraphPane.tsx
│   │   ├── TimelinePane.tsx
│   │   └── MapPane.tsx
│   ├── storage/
│   │   ├── LocalGraph.ts       # IndexedDB graph storage
│   │   ├── ProvenanceWallet.ts
│   │   └── SyncCoordinator.ts
│   ├── crdt/
│   │   ├── EntityCRDT.ts
│   │   └── ConflictResolver.ts
│   ├── mesh/
│   │   └── MeshRelay.ts
│   └── airgap/
│       └── UpdatePackager.ts
├── tests/
│   ├── conflict-scenarios/
│   └── sync-tests/
├── offline-tiles/              # Pre-packaged map tiles
└── README.md
```

**Local Storage Schema** (IndexedDB):
```typescript
interface OfflineDB {
  entities: EntityStore;        // CRDT entity documents
  relationships: RelationshipStore;
  provenance: ProvenanceStore;
  operations: OperationLog;     // All local ops for replay
  syncCheckpoints: CheckpointStore;
}
```

**Sync Protocol**:
1. Client generates `SyncRequest` with last known checkpoint
2. Server computes delta since checkpoint
3. Client applies delta using CRDT merge
4. Conflicts resolved per CRDT semantics (LWW, OR-Set, etc.)
5. Divergence report generated
6. Provenance chains merged and signed
7. New checkpoint created

### Deliverables Checklist

- [x] Offline tri-pane UI (Graph/Timeline/Map)
- [x] Local graph storage (IndexedDB + Cypher subset)
- [x] Provenance wallet with signing
- [x] CRDT entity model (Automerge integration)
- [x] Sync coordinator with conflict resolution
- [x] Divergence report generator
- [x] Signed resync logs
- [x] Mesh relay stub (peer discovery + sync)
- [x] Air-gapped update packager CLI
- [x] Offline map tiles (sample dataset)
- [x] Conflict resolution test suite (20+ scenarios)
- [x] README with deployment guide
- [x] Electron app for desktop deployment

### Acceptance Criteria

1. **Offline Operation**
   - [ ] Disconnect network
   - [ ] Create entity, relationship in graph pane
   - [ ] Verify appears in timeline/map
   - [ ] Query local graph with Cypher
   - [ ] Confirm all ops logged to provenance wallet

2. **CRDT Merge**
   - [ ] Client A: Update entity name to "Name A"
   - [ ] Client B: Update same entity name to "Name B"
   - [ ] Reconnect and sync
   - [ ] Verify LWW resolution (most recent update wins)
   - [ ] Check divergence report shows conflict + resolution

3. **Provenance Chain**
   - [ ] Perform 10 offline operations
   - [ ] Sync to server
   - [ ] Query prov-ledger for chain
   - [ ] Verify all 10 ops present with signatures

4. **Mesh Relay** (Bonus)
   - [ ] Two offline clients discover each other (mDNS)
   - [ ] Sync updates peer-to-peer
   - [ ] Verify both clients converge to same state

5. **Air-Gapped Bundle**
   - [ ] Generate update bundle
   - [ ] Apply on disconnected system
   - [ ] Verify signature and checksums
   - [ ] Confirm updates applied correctly

## Implementation Notes

### CRDT Library Choice

**Automerge** (recommended):
- Pros: Rich data types (text, counters, maps), mature, TypeScript support
- Cons: Larger bundle size

**Yjs**:
- Pros: Extremely fast, smaller bundles, great for collaborative editing
- Cons: More low-level, less ergonomic API

**Recommendation**: Use Automerge for complex entity models, Yjs for real-time collaborative text editing.

### Offline Map Tiles

- Pre-package OpenStreetMap tiles for target regions
- Use MBTiles format for compact storage
- Include tile server (tileserver-gl) in Electron app
- Provide downloader tool: `offline-kit download-tiles --bbox [minLon,minLat,maxLon,maxLat] --zoom 1-12`

### Security Considerations

- Encrypt local storage (Web Crypto API + device key)
- Require device unlock (PIN/biometric) after inactivity
- Wipe local data on tamper detection
- Audit all sync operations with device fingerprint

### Performance

- Limit local graph to 100K entities (warn if exceeded)
- Incremental CRDT sync (don't retransmit entire doc)
- Background sync worker (Service Worker)
- Optimize IndexedDB queries with indexes

## References

- [Automerge CRDT](https://automerge.org/)
- [PouchDB Offline First](https://pouchdb.com/)
- [Leaflet Offline Maps](https://github.com/allartk/leaflet.offline)

## Related Prompts

- **DQ-001**: Data Quality Dashboard (for offline DQ checks)
- **GOV-002**: Retention & Purge (for managing offline data lifecycle)
