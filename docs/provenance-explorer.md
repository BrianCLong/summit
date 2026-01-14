# Provenance Explorer

## Overview

The Provenance Explorer is a production-grade UI and API system for inspecting, auditing, and exporting build and runtime provenance data. It provides operators and administrators with full visibility into the provenance chain—from inputs through transformations to outputs—with integrity verification and evidence pack export capabilities.

## Architecture

### Components

1. **Server API** (`server/src/conductor/api/provenance-routes.ts`)
   - Authorization-protected REST endpoints
   - Postgres-backed provenance storage
   - Evidence pack generation and export
   - Health monitoring

2. **Client UI** (`apps/web/src/pages/ops/ProvenanceExplorerPage.tsx`)
   - React-based explorer interface
   - Feature-flagged access control
   - Offline-first with caching
   - Multi-select and bulk export

3. **Navigation Integration** (`apps/web/src/components/Navigation.tsx`)
   - Shield icon nav entry
   - RBAC-based visibility (requires `evidence:read` permission)

## API Endpoints

All endpoints require authentication and appropriate permissions.

### GET /api/ops/provenance/summary

Returns a paginated summary of recent provenance items.

**Query Parameters:**
- `limit` (optional, max 200): Number of items to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "run-abc123",
      "type": "run",
      "createdAt": "2026-01-10T12:00:00Z",
      "actor": "user@example.com",
      "source": "build-pipeline",
      "commit": "a1b2c3d",
      "status": "success",
      "integrity": {
        "hash": "sha256:...",
        "verified": true,
        "signatureValid": true
      },
      "links": {
        "runId": "run-abc123",
        "buildId": "build-xyz"
      },
      "metadata": {
        "artifactCount": 3,
        "tenantId": "tenant-1"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 42,
    "hasMore": false
  }
}
```

**Authorization:** Requires `evidence:read` permission

---

### GET /api/ops/provenance/item/:id

Returns full provenance details for a specific item.

**Path Parameters:**
- `id`: Provenance item ID (typically a run ID)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "run-abc123",
    "type": "run",
    "createdAt": "2026-01-10T12:00:00Z",
    "actor": "user@example.com",
    "source": "build-pipeline",
    "status": "success",
    "integrity": {
      "verified": true
    },
    "links": {
      "runId": "run-abc123"
    },
    "inputs": [
      {
        "id": "input-1",
        "type": "config",
        "hash": "sha256:abc...",
        "source": "s3://bucket/config.json"
      }
    ],
    "outputs": [
      {
        "id": "output-1",
        "type": "receipt",
        "hash": "sha256:def...",
        "destination": "s3://bucket/receipt.json"
      }
    ],
    "steps": [
      {
        "id": "step-1",
        "name": "started",
        "status": "completed",
        "startedAt": "2026-01-10T12:00:00Z",
        "endedAt": "2026-01-10T12:01:00Z",
        "duration": 60000
      }
    ],
    "hashes": {
      "contentHash": "sha256:...",
      "receiptHash": "sha256:..."
    },
    "signatures": [],
    "policyDecisions": [],
    "relatedIds": []
  }
}
```

**Authorization:** Requires `evidence:read` permission

---

### GET /api/ops/provenance/search

Search provenance items with filters.

**Query Parameters:**
- `q` (optional): Free-text search query (searches ID, runbook, creator)
- `status` (optional): Filter by status (`success`, `failed`, `pending`)
- `from` (optional): ISO 8601 date for start of time range
- `to` (optional): ISO 8601 date for end of time range
- `limit` (optional, max 200): Number of results
- `offset` (optional): Pagination offset

**Example:**
```
GET /api/ops/provenance/search?q=prod-deploy&status=success&from=2026-01-01&limit=10
```

**Response:** Same format as `/summary`

**Authorization:** Requires `evidence:read` permission

---

### POST /api/ops/provenance/evidence-pack

Generate and export an evidence pack for selected provenance items.

**Request Body:**
```json
{
  "ids": ["run-1", "run-2", "run-3"],
  "format": "json" | "download"
}
```

**Response (format=json):**
```json
{
  "success": true,
  "data": {
    "payload": {
      "version": "1.0.0",
      "generatedAt": "2026-01-10T14:30:00Z",
      "generatedBy": "user@example.com",
      "format": "json",
      "items": [...],
      "metadata": {
        "itemCount": 3,
        "totalArtifacts": 9,
        "exportedBy": "user@example.com",
        "tenantId": "tenant-1"
      },
      "signature": {
        "algorithm": "SHA-256",
        "timestamp": "2026-01-10T14:30:00Z",
        "value": "..."
      }
    },
    "downloadUrl": "/api/ops/provenance/evidence-pack/2026-01-10T14:30:00Z"
  }
}
```

**Response (format=download):**
Direct file download with `Content-Disposition: attachment` header.

**Constraints:**
- Maximum 100 items per evidence pack
- Minimum 1 item required

**Authorization:** Requires `evidence:create` permission

---

### GET /api/ops/provenance/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T14:30:00Z",
  "database": "connected",
  "runCount": 1234
}
```

**Authorization:** None (public health check)

---

## Data Model

### Provenance Item

Core structure representing a provenance record:

- `id`: Unique identifier
- `type`: Item type (`run`, `build`, `deployment`, etc.)
- `createdAt`: ISO 8601 timestamp
- `actor`: User/system that initiated
- `source`: Origin (runbook, pipeline, etc.)
- `commit`: Git commit SHA (if applicable)
- `status`: Execution status
- `integrity`: Verification metadata
- `links`: Related identifiers (runId, buildId, etc.)
- `metadata`: Additional context

### Provenance Details

Extended structure with full provenance chain:

- All fields from Provenance Item
- `inputs[]`: Input artifacts with hashes
- `outputs[]`: Output artifacts with hashes
- `steps[]`: Execution steps timeline
- `hashes`: Content and receipt hashes
- `signatures[]`: Cryptographic signatures
- `policyDecisions[]`: OPA policy evaluation results
- `relatedIds[]`: Related provenance items

## Data Sources

Provenance data is sourced from:

1. **Run Database** (`run`, `run_event`, `evidence_artifacts` tables)
   - Maestro conductor executions
   - Workflow runs
   - Build processes

2. **Evidence Artifacts**
   - Receipts (provenance receipts)
   - Logs
   - Configs
   - SBOMs
   - Attestations

## Where Provenance Events Are Generated

Provenance events are emitted at the following locations in the codebase:

1. **Maestro Conductor Runs** (`server/src/maestro/`)
   - Run start/end events stored in `run` table
   - Evidence artifacts created during execution
   - Receipts generated via `server/src/conductor/api/evidence-routes.ts`

2. **Build Pipelines** (various CI/CD integrations)
   - Build metadata captured
   - Artifact hashes recorded
   - SBOM generation

3. **Deployment Events** (`server/src/conductor/workflows/`)
   - Deployment provenance
   - Configuration snapshots
   - Policy decisions

## Adding New Provenance Types

To add a new provenance type:

1. **Emit Structured Events**
   ```typescript
   import { getPostgresPool } from '@/db/postgres';

   const pool = getPostgresPool();
   await pool.query(
     `INSERT INTO run (id, runbook, status, started_at, created_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)`,
     [runId, 'my-new-type', 'success', new Date(), userId, tenantId]
   );
   ```

2. **Create Evidence Artifacts**
   ```typescript
   await pool.query(
     `INSERT INTO evidence_artifacts (id, run_id, artifact_type, sha256_hash, size_bytes, created_at)
      VALUES ($1, $2, $3, $4, $5, now())`,
     [artifactId, runId, 'my-artifact-type', hash, sizeBytes]
   );
   ```

3. **Update Type Definitions** (optional)
   Add new type to `ProvenanceItem['type']` in `provenance-routes.ts`

## UI Features

### Search and Filtering

- **Free-text search**: Search across IDs, sources, and actors
- **Status filter**: Filter by success, failed, pending
- **Date range**: Filter by creation time range

### Offline Support

The UI implements offline-first architecture:

- **Automatic caching**: Successful fetches are cached to localStorage
- **Offline detection**: Visual indicator when offline
- **Stale data badge**: Shows when viewing cached data
- **Cache restoration**: Automatically loads cache when offline or on error

### Evidence Pack Export

- **Multi-select**: Select multiple items via checkboxes
- **Bulk export**: Export up to 100 items as a single evidence pack
- **Format options**: JSON or direct download
- **Signature**: Includes cryptographic signature for verification

### Detail View

- **Side drawer**: Click any row to open detailed view
- **Provenance chain**: View inputs, outputs, and transformation steps
- **Integrity indicators**: Visual verification status
- **Policy decisions**: View OPA policy evaluation results
- **Hashes**: Full content hashes for verification

## Authorization

### Required Permissions

| Endpoint | Permission |
|----------|------------|
| GET /summary | `evidence:read` |
| GET /item/:id | `evidence:read` |
| GET /search | `evidence:read` |
| POST /evidence-pack | `evidence:create` |

### Roles

Default roles with provenance access:

- **admin**: Full access (all permissions)
- **operator**: Read and create evidence (`evidence:read`, `evidence:create`)
- **analyst**: Read-only access (`evidence:read`)
- **viewer**: No access

## Feature Flag

The Provenance Explorer is controlled by the feature flag:

```typescript
'ops.provenanceExplorer': true  // Enabled by default
```

Override via environment variable:
```bash
VITE_ENABLE_OPS_PROVENANCE_EXPLORER=true
```

## Evidence Pack Format

Evidence packs follow this structure:

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-10T14:30:00Z",
  "generatedBy": "user@example.com",
  "format": "json",
  "items": [
    {
      "id": "run-1",
      "type": "run",
      "status": "success",
      "createdAt": "2026-01-10T12:00:00Z",
      "completedAt": "2026-01-10T12:05:00Z",
      "actor": "user@example.com",
      "source": "build-pipeline",
      "tenantId": "tenant-1",
      "artifacts": [
        {
          "id": "artifact-1",
          "type": "receipt",
          "hash": "sha256:...",
          "size": 2048,
          "createdAt": "2026-01-10T12:05:00Z"
        }
      ]
    }
  ],
  "metadata": {
    "itemCount": 1,
    "totalArtifacts": 3,
    "exportedBy": "user@example.com",
    "tenantId": "tenant-1"
  },
  "signature": {
    "algorithm": "SHA-256",
    "timestamp": "2026-01-10T14:30:00Z",
    "value": "..."
  }
}
```

### Intended Consumers

Evidence packs are designed for:

1. **Audit Teams**: Compliance verification and regulatory reporting
2. **Incident Response**: Root cause analysis and forensics
3. **Security Reviews**: Integrity verification and threat hunting
4. **Governance**: Policy compliance validation

## Testing

### Server Tests

```bash
cd server
npm test src/conductor/api/__tests__/provenance-routes.test.ts
```

### Client Tests

```bash
cd apps/web
npm test src/pages/ops/__tests__/ProvenanceExplorerPage.test.tsx
```

### Integration Tests

Tests cover:
- ✓ Authorization enforcement
- ✓ Data validation
- ✓ Pagination
- ✓ Search filters
- ✓ Evidence pack generation
- ✓ Error handling
- ✓ Offline behavior
- ✓ Cache management
- ✓ Console error prevention

## Performance Considerations

- **Pagination**: Default limit of 50, maximum 200
- **Caching**: Client-side caching reduces server load
- **Indexes**: Database indexes on `run.started_at`, `run.status`
- **Evidence pack limit**: Maximum 100 items per export

## Security

- **Authentication**: All endpoints require valid JWT or OAuth proxy headers
- **Authorization**: RBAC enforced via middleware
- **Audit logging**: All operations logged via usage ledger
- **Signature verification**: Evidence packs include cryptographic signatures
- **Tenant isolation**: Multi-tenant data separation enforced

## Troubleshooting

### "Provenance Explorer is not enabled"

**Cause:** Feature flag is disabled
**Solution:** Set `VITE_ENABLE_OPS_PROVENANCE_EXPLORER=true`

### "Authentication required"

**Cause:** Missing or invalid auth token
**Solution:** Ensure valid JWT in Authorization header or OAuth proxy headers

### "Insufficient permissions"

**Cause:** User lacks `evidence:read` or `evidence:create` permission
**Solution:** Assign operator or admin role to user

### Empty results

**Cause:** No runs in database or filters too restrictive
**Solution:** Check database for run records, adjust search filters

### Offline with no cached data

**Cause:** No previous successful fetch while online
**Solution:** Connect to network and fetch data to populate cache

## Future Enhancements

- **SLSA verification**: Automated SLSA level verification
- **Policy simulation**: What-if analysis for policy changes
- **Real-time updates**: WebSocket-based live updates
- **Advanced filters**: More granular filtering options
- **Export formats**: YAML, CSV, and bundle formats
- **Batch operations**: Bulk verify, re-sign, or archive
