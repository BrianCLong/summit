# @summit/integration-contracts

Unified integration contracts for the Summit critical path (IG-101, MC-205, CO-58, SB-33).

Provides versioned TypeScript schemas and runtime validators for cross-service communication across:
- **IntelGraph (IG-101)**: Canonical graph model
- **Maestro Conductor (MC-205)**: Orchestration
- **CompanyOS (CO-58)**: Product-facing API
- **Switchboard (SB-33)**: Ingestion/routing

## Installation

```bash
pnpm add @summit/integration-contracts
```

## Features

- 🔒 **Type-safe**: Full TypeScript type definitions
- ✅ **Runtime validation**: Zod validators for all schemas
- 📦 **Versioned**: API version support (v1)
- 🧪 **Tested**: Comprehensive test coverage
- 📖 **Documented**: JSDoc comments on all fields

## Usage

### Basic Import

```typescript
import {
  PersonEntityV1,
  AssociatedWithEdgeV1,
  IngestPersonRequestV1,
  CreatePersonNetworkInsightRequestV1,
} from '@summit/integration-contracts/v1'
```

### Creating a Person Entity

```typescript
import { PersonEntityV1 } from '@summit/integration-contracts/v1'

const person: PersonEntityV1 = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'Person',
  version: 'v1',
  attributes: {
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '+1-555-1234',
    title: 'Software Engineer',
    organization: 'Acme Corp',
  },
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    source: 'csv-import',
    confidence: 0.95,
  },
}

// Runtime validation
try {
  const validated = PersonEntityV1.parse(person)
  console.log('Valid person:', validated)
} catch (error) {
  console.error('Validation failed:', error)
}
```

### Creating an Association Edge

```typescript
import { AssociatedWithEdgeV1 } from '@summit/integration-contracts/v1'

const association: AssociatedWithEdgeV1 = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  type: 'ASSOCIATED_WITH',
  version: 'v1',
  from: '123e4567-e89b-12d3-a456-426614174000', // Alice
  to: '323e4567-e89b-12d3-a456-426614174000',   // Bob
  attributes: {
    relationshipType: 'colleague',
    strength: 0.8,
    description: 'Work colleagues at Acme Corp',
  },
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    source: 'csv-import',
    confidence: 0.85,
  },
}
```

### Switchboard → IntelGraph Ingestion

```typescript
import { IngestPersonRequestV1 } from '@summit/integration-contracts/v1'
import { v4 as uuidv4 } from 'uuid'

const ingestRequest: IngestPersonRequestV1 = {
  version: 'v1',
  correlationId: uuidv4(),
  source: {
    id: 'csv-import-001',
    name: 'CSV Import',
    type: 'csv',
    version: '1.0',
  },
  provenance: {
    ingestedAt: new Date().toISOString(),
    ingestedBy: 'system@example.com',
    confidence: 0.9,
  },
  payload: {
    persons: [person],
    associations: [association],
  },
}

// POST to Switchboard ingestion endpoint
const response = await fetch('http://switchboard/v1/ingest/persons', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ingestRequest),
})

const result = await response.json()
console.log('Ingestion result:', result)
```

### IntelGraph Query

```typescript
import { GetPersonNetworkRequestV1 } from '@summit/integration-contracts/v1'

const queryRequest: GetPersonNetworkRequestV1 = {
  version: 'v1',
  personId: '123e4567-e89b-12d3-a456-426614174000',
  depth: 2, // 2 hops
  includeMetadata: true,
  relationshipTypes: ['colleague', 'business'],
}

// GET from IntelGraph
const response = await fetch(
  `http://intelgraph/v1/persons/${queryRequest.personId}/network?depth=${queryRequest.depth}`,
  { headers: { 'Content-Type': 'application/json' } }
)

const network = await response.json()
console.log('Network size:', network.associations.length)
```

### Maestro Workflow Execution

```typescript
import { StartPersonNetworkWorkflowRequestV1 } from '@summit/integration-contracts/v1'

const workflowRequest: StartPersonNetworkWorkflowRequestV1 = {
  version: 'v1',
  workflow: 'person-network-analysis',
  namespace: 'integration',
  inputs: {
    version: 'v1',
    personId: '123e4567-e89b-12d3-a456-426614174000',
    analysisDepth: 2,
    includeAnalysis: true,
  },
  metadata: {
    correlationId: uuidv4(),
    initiatedBy: 'user@example.com',
    priority: 'normal',
  },
}

// POST to Maestro
const startResponse = await fetch('http://maestro/v1/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workflowRequest),
})

const { runId } = await startResponse.json()

// Poll for completion
const statusResponse = await fetch(`http://maestro/v1/status/${runId}`)
const status = await statusResponse.json()
console.log('Workflow status:', status.status)
```

### CompanyOS Insights API

```typescript
import { CreatePersonNetworkInsightRequestV1 } from '@summit/integration-contracts/v1'

const insightRequest: CreatePersonNetworkInsightRequestV1 = {
  version: 'v1',
  personId: '123e4567-e89b-12d3-a456-426614174000',
  depth: 2,
  options: {
    includeAnalysis: true,
    maxNetworkSize: 100,
  },
  metadata: {
    requestedBy: 'user@example.com',
  },
}

// POST to CompanyOS
const response = await fetch('http://companyos/v1/insights/person-network', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(insightRequest),
})

const insight = await response.json()
console.log('Insight:', insight.data?.summary)
console.log('Network size:', insight.data?.network.size)
console.log('Maestro run ID:', insight.metadata.maestroRunId)
```

## Contract Validation

All contracts include Zod validators for runtime validation:

```typescript
import { PersonEntityV1 } from '@summit/integration-contracts/v1'

// Safe parsing (returns result object)
const result = PersonEntityV1.safeParse(untrustedData)
if (result.success) {
  console.log('Valid:', result.data)
} else {
  console.error('Invalid:', result.error.issues)
}

// Direct parsing (throws on error)
try {
  const validated = PersonEntityV1.parse(untrustedData)
  // Use validated data
} catch (error) {
  console.error('Validation error:', error)
}
```

## Available Contracts

### Entities (v1)
- `PersonEntityV1` - Individual person
- `OrganizationEntityV1` - Company or organization
- `EntityV1` - Discriminated union of all entity types

### Edges (v1)
- `AssociatedWithEdgeV1` - Generic person-to-person association
- `WorksForEdgeV1` - Person-to-organization employment
- `OwnsEdgeV1` - Ownership relationship
- `EdgeV1` - Discriminated union of all edge types

### Ingestion (v1)
- `IngestPersonRequestV1` / `IngestPersonResponseV1` - Person ingestion
- `IngestOrganizationRequestV1` - Organization ingestion
- `IngestRequestV1` / `IngestResponseV1` - Generic ingestion
- `BatchIngestionStatusRequestV1` / `BatchIngestionStatusResponseV1` - Batch status

### Queries (v1)
- `GetPersonRequestV1` / `GetPersonResponseV1` - Get person by ID
- `GetPersonNetworkRequestV1` / `GetPersonNetworkResponseV1` - Get person network
- `GetEntityRequestV1` / `GetEntityResponseV1` - Generic entity lookup
- `SearchEntitiesRequestV1` / `SearchEntitiesResponseV1` - Entity search
- `GetEntityContextRequestV1` / `GetEntityContextResponseV1` - Full entity context

### Workflows (v1)
- `PersonNetworkWorkflowInputV1` / `PersonNetworkWorkflowOutputV1` - Person network analysis workflow
- `StartWorkflowRequestV1` / `StartWorkflowResponseV1` - Start workflow
- `GetWorkflowStatusRequestV1` / `GetWorkflowStatusResponseV1` - Workflow status
- `CancelWorkflowRequestV1` / `CancelWorkflowResponseV1` - Cancel workflow

### Insights (v1)
- `CreatePersonNetworkInsightRequestV1` / `CreatePersonNetworkInsightResponseV1` - Person network insights
- `GetInsightRequestV1` / `GetInsightResponseV1` - Get insight
- `ListInsightsRequestV1` / `ListInsightsResponseV1` - List insights
- `DeleteInsightRequestV1` / `DeleteInsightResponseV1` - Delete insight

### Provenance (v1)
- `SourceMetadataV1` - Data source metadata
- `ProvenanceV1` - Provenance tracking
- `EntityMetadataV1` - Entity lifecycle metadata
- `EdgeMetadataV1` - Edge metadata

## Type Guards

Use discriminated unions with type guards:

```typescript
import { EntityV1, isPerson, isOrganization } from '@summit/integration-contracts/v1'

function processEntity(entity: EntityV1) {
  if (isPerson(entity)) {
    console.log('Person:', entity.attributes.name)
  } else if (isOrganization(entity)) {
    console.log('Organization:', entity.attributes.name)
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Type check
pnpm type-check
```

## Versioning

This package follows semantic versioning. Breaking changes to contracts require:
1. Major version bump (e.g., 1.x.x → 2.0.0)
2. New API version (e.g., v1 → v2)
3. Migration guide in CHANGELOG

## License

PROPRIETARY - Summit Team

---

**Integration Critical Path**: IG-101 → MC-205 → CO-58 + SB-33
