# IntelGraph Entity Resolution & Identity Service

A standalone, high-performance entity resolution service with pluggable scoring, reversible merges, and full explainability.

## Features

- **Multi-Signal Feature Extraction**: Name similarity, aliases, geo/temporal co-occurrence, device IDs, account IDs, IP addresses
- **Pluggable Scoring**: Deterministic, probabilistic, and hybrid scoring methods
- **Reversible Operations**: All merges are reversible with full audit trail
- **Explainability**: Detailed explanations of ER decisions with feature contributions
- **High Performance**: Target 100+ merge operations per second
- **Full Test Coverage**: ≥90% code coverage with golden datasets

## Architecture

```
er-service/
├── src/
│   ├── core/
│   │   ├── features.ts      # Feature extraction (name, geo, device, etc.)
│   │   └── er-engine.ts     # Main ER orchestration engine
│   ├── scoring/
│   │   └── scorer.ts        # Deterministic, probabilistic, hybrid scorers
│   ├── storage/
│   │   └── storage.ts       # In-memory storage with audit trail
│   ├── api/
│   │   └── routes.ts        # REST API endpoints
│   ├── types.ts             # Core type definitions
│   └── index.ts             # Express server entrypoint
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── benchmarks/          # Performance tests
│   └── fixtures/            # Golden test datasets
└── package.json
```

## API Endpoints

### POST /api/v1/candidates
Find candidate matches for an entity.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "entity": {
    "id": "e1",
    "type": "person",
    "name": "John Smith",
    "attributes": { "email": "john@example.com" },
    "deviceIds": ["device-1"],
    "accountIds": ["acct-1"]
  },
  "population": [...],
  "topK": 5,
  "threshold": 0.7,
  "method": "hybrid"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "candidates": [
    {
      "entityId": "e2",
      "score": 0.85,
      "confidence": 0.92,
      "features": {...},
      "rationale": ["Name similarity: 85%", "Device ID match: 100%"],
      "method": "hybrid"
    }
  ],
  "executionTimeMs": 45
}
```

### POST /api/v1/merge
Merge entities into a canonical record.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "entityIds": ["e1", "e2", "e3"],
  "primaryId": "e1",
  "actor": "analyst@example.com",
  "reason": "Duplicate detection",
  "policyTags": ["er:manual-review"],
  "confidence": 0.85
}
```

**Response:**
```json
{
  "mergeId": "merge-uuid",
  "tenantId": "tenant-123",
  "primaryId": "e1",
  "mergedIds": ["e2", "e3"],
  "actor": "analyst@example.com",
  "reason": "Duplicate detection",
  "mergedAt": "2024-01-15T10:00:00Z",
  "reversible": true
}
```

### POST /api/v1/merge/:mergeId/revert
Revert a merge operation.

**Request:**
```json
{
  "actor": "supervisor@example.com",
  "reason": "False positive"
}
```

### POST /api/v1/split
Split an entity into multiple entities.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "entityId": "e1",
  "splitGroups": [
    {
      "attributes": { "context": "work" },
      "deviceIds": ["device-1"]
    },
    {
      "attributes": { "context": "personal" },
      "deviceIds": ["device-2"]
    }
  ],
  "actor": "analyst@example.com",
  "reason": "Separate identities"
}
```

### GET /api/v1/explain/:mergeId
Get explanation for a merge decision.

**Response:**
```json
{
  "mergeId": "merge-uuid",
  "features": {
    "nameSimilarity": 0.85,
    "deviceIdMatch": 1.0,
    "typeMatch": true,
    ...
  },
  "rationale": [
    "nameSimilarity: 85.0% (weight: 25%)",
    "deviceIdMatch: 100.0% (weight: 10%)"
  ],
  "featureWeights": {...},
  "threshold": 0.7,
  "method": "hybrid",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### GET /api/v1/audit
Retrieve audit log.

**Query Parameters:**
- `tenantId`: Filter by tenant
- `actor`: Filter by actor
- `event`: Filter by event type (merge, revert, split)
- `limit`: Limit number of results

### GET /api/v1/stats
Get service statistics.

### GET /api/v1/health
Health check endpoint.

## Installation

```bash
cd er-service
npm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run benchmarks
npm run test:benchmarks

# Lint
npm run lint
```

## Usage Example

### Using the Client

```typescript
import { createERClient } from '../server/src/er-client';

const client = createERClient({
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
});

// Find candidates
const candidates = await client.candidates({
  tenantId: 'tenant-123',
  entity: myEntity,
  population: allEntities,
  topK: 5,
});

// Merge entities
const merge = await client.merge({
  tenantId: 'tenant-123',
  entityIds: ['e1', 'e2'],
  actor: 'analyst@example.com',
  reason: 'Duplicate',
});

// Get explanation
const explanation = await client.explain(merge.mergeId);
console.log(explanation.rationale);

// Revert if needed
await client.revertMerge(merge.mergeId, 'supervisor@example.com', 'False positive');
```

## Configuration

Set environment variables:

```bash
PORT=3001  # Default: 3001
```

## Performance

Target metrics:
- **Merge operations**: ≥100 ops/sec
- **Candidate search**: <100ms for 1000 entities
- **Test coverage**: ≥90%

## Acceptance Criteria

- ✅ All tests pass
- ✅ Coverage for core ER logic ≥90%
- ✅ Reproducible merge test passes on golden dataset
- ✅ ER Explainability test verifies human-readable feature weights
- ✅ No other teams need code changes (typed client provided)
- ✅ Performance benchmarks meet targets

## Security & Compliance

- No biometric identification
- Full audit trail with userId + reason for all operations
- Reversible merges with policy tag support
- Tenant isolation enforced

## License

Proprietary - IntelGraph Platform
