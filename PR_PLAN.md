# Integration Critical Path - PR Series
**Mission:** IG-101 → MC-205 → CO-58 + SB-33
**Target Branch:** `claude/setup-staff-engineer-role-ayWTk`

---

## PR Series Overview

| PR | Title | Files Changed | Tests | Status |
|----|-------|---------------|-------|--------|
| **PR-1** | feat(contracts): unified integration contracts v1 | ~15 | Contract tests | 📋 Planned |
| **PR-2** | feat(intelgraph): canonical person entity + upsert API | ~10 | Unit + contract | 📋 Planned |
| **PR-3** | feat(switchboard): person ingestion + idempotency + provenance | ~12 | Unit + integration | 📋 Planned |
| **PR-4** | feat(maestro): person-network-analysis workflow | ~8 | Workflow unit tests | 📋 Planned |
| **PR-5** | feat(companyos): POST /v1/insights/person-network endpoint | ~10 | E2E integration | 📋 Planned |
| **PR-6** | test(integration): full-stack harness + CI gate | ~6 | Smoke + contract drift | 📋 Planned |

---

## PR-1: Unified Integration Contracts v1
**Branch:** `claude/setup-staff-engineer-role-ayWTk`
**Theme:** Establish single source of truth for cross-service contracts

### Scope
Create a new unified contracts package at `/contracts/integration/` with versioned schemas shared across all four services.

### Files to Create
```
/contracts/integration/
├── package.json                      (NEW)
├── tsconfig.json                     (NEW)
├── src/
│   ├── index.ts                      (NEW - re-exports)
│   ├── v1/
│   │   ├── index.ts                  (NEW)
│   │   ├── entities.ts               (NEW - Person entity schema)
│   │   ├── edges.ts                  (NEW - ASSOCIATED_WITH edge schema)
│   │   ├── ingestion.ts              (NEW - Switchboard → IG contract)
│   │   ├── queries.ts                (NEW - IG query request/response)
│   │   ├── workflows.ts              (NEW - Maestro workflow spec)
│   │   ├── insights.ts               (NEW - CompanyOS API contract)
│   │   └── provenance.ts             (NEW - Provenance metadata schema)
│   └── validators/
│       ├── index.ts                  (NEW)
│       └── zod-schemas.ts            (NEW - Zod validators)
└── tests/
    ├── entities.test.ts              (NEW)
    ├── ingestion.test.ts             (NEW)
    ├── workflows.test.ts             (NEW)
    └── insights.test.ts              (NEW)
```

### Key Schemas

#### 1. Person Entity (`entities.ts`)
```typescript
import { z } from 'zod'

export const PersonEntityV1 = z.object({
  id: z.string().uuid(),
  type: z.literal('Person'),
  version: z.literal('v1'),
  attributes: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    source: z.string(),
    confidence: z.number().min(0).max(1),
  }),
})

export type PersonEntityV1 = z.infer<typeof PersonEntityV1>
```

#### 2. ASSOCIATED_WITH Edge (`edges.ts`)
```typescript
export const AssociatedWithEdgeV1 = z.object({
  id: z.string().uuid(),
  type: z.literal('ASSOCIATED_WITH'),
  version: z.literal('v1'),
  from: z.string().uuid(), // Person ID
  to: z.string().uuid(),   // Person ID
  attributes: z.object({
    relationshipType: z.enum(['colleague', 'family', 'business', 'unknown']),
    strength: z.number().min(0).max(1), // Confidence score
  }),
  metadata: z.object({
    createdAt: z.string().datetime(),
    source: z.string(),
    confidence: z.number().min(0).max(1),
  }),
})
```

#### 3. Ingestion Payload (`ingestion.ts`)
```typescript
export const IngestPersonRequestV1 = z.object({
  version: z.literal('v1'),
  correlationId: z.string().uuid(),
  source: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['csv', 'http', 'stix', 'rss', 'manual']),
  }),
  provenance: z.object({
    ingestedAt: z.string().datetime(),
    ingestedBy: z.string().optional(),
    confidence: z.number().min(0).max(1),
  }),
  payload: z.object({
    persons: z.array(PersonEntityV1),
    associations: z.array(AssociatedWithEdgeV1).optional(),
  }),
})

export const IngestPersonResponseV1 = z.object({
  version: z.literal('v1'),
  correlationId: z.string().uuid(),
  result: z.object({
    success: z.boolean(),
    entitiesCreated: z.number(),
    entitiesUpdated: z.number(),
    edgesCreated: z.number(),
    errors: z.array(z.object({
      entityId: z.string().optional(),
      error: z.string(),
    })).optional(),
  }),
})
```

#### 4. Graph Query Contract (`queries.ts`)
```typescript
export const GetPersonNetworkRequestV1 = z.object({
  version: z.literal('v1'),
  personId: z.string().uuid(),
  depth: z.number().int().min(1).max(3).default(1),
  includeMetadata: z.boolean().default(true),
})

export const GetPersonNetworkResponseV1 = z.object({
  version: z.literal('v1'),
  person: PersonEntityV1,
  associations: z.array(z.object({
    edge: AssociatedWithEdgeV1,
    relatedPerson: PersonEntityV1,
  })),
  metadata: z.object({
    queryTime: z.string().datetime(),
    resultCount: z.number(),
  }),
})
```

#### 5. Maestro Workflow Contract (`workflows.ts`)
```typescript
export const PersonNetworkWorkflowInputV1 = z.object({
  version: z.literal('v1'),
  personId: z.string().uuid(),
  analysisDepth: z.number().int().min(1).max(3).default(2),
})

export const PersonNetworkWorkflowOutputV1 = z.object({
  version: z.literal('v1'),
  runId: z.string().uuid(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.object({
    person: PersonEntityV1,
    networkSize: z.number(),
    summary: z.string(),
    associations: z.array(AssociatedWithEdgeV1),
  }).optional(),
})
```

#### 6. CompanyOS Insights API (`insights.ts`)
```typescript
export const CreatePersonNetworkInsightRequestV1 = z.object({
  version: z.literal('v1'),
  personId: z.string().uuid(),
  depth: z.number().int().min(1).max(3).default(2),
})

export const CreatePersonNetworkInsightResponseV1 = z.object({
  version: z.literal('v1'),
  insightId: z.string().uuid(),
  person: PersonEntityV1,
  network: z.object({
    size: z.number(),
    associations: z.array(z.object({
      edge: AssociatedWithEdgeV1,
      relatedPerson: PersonEntityV1,
    })),
  }),
  summary: z.string(),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    maestroRunId: z.string().uuid(),
  }),
})
```

### Tests (Contract Validation)
Each contract file gets a corresponding test file validating:
- Valid payloads pass validation
- Invalid payloads fail with correct error messages
- Edge cases (optional fields, boundary values)
- Backward compatibility (if versioning)

### Definition of Done
- [ ] All schemas defined with Zod validators
- [ ] Package builds successfully (`pnpm build`)
- [ ] All contract tests pass (`pnpm test`)
- [ ] TypeScript types exported
- [ ] README with usage examples
- [ ] CHANGELOG entry
- [ ] Rollback note: Remove package, revert dependencies

### Commit Message
```
feat(contracts): unified integration contracts v1

- Add Person entity schema with metadata + provenance
- Add ASSOCIATED_WITH edge schema
- Add Switchboard → IntelGraph ingestion contract
- Add IntelGraph query request/response contracts
- Add Maestro workflow input/output contracts
- Add CompanyOS insights API contracts
- Include Zod validators for runtime validation
- Add contract tests for all schemas

This establishes the single source of truth for cross-service
contracts supporting the IG-101 → MC-205 → CO-58 + SB-33
integration critical path.

BREAKING CHANGE: New package requires services to adopt
versioned contracts for inter-service communication.

Refs: IG-101, MC-205, CO-58, SB-33
```

---

## PR-2: IntelGraph - Canonical Person Entity + Upsert API
**Theme:** Implement minimal graph model for Person entities

### Scope
Extend IntelGraph to support Person entities with idempotent upsert and query operations using the unified contracts.

### Files to Modify/Create
```
/intelgraph/
├── package.json                       (MODIFY - add contracts dependency)
├── api.py                             (MODIFY - add person endpoints)
├── server/src/
│   ├── models/
│   │   └── person.py                  (NEW - Person Neo4j model)
│   ├── repositories/
│   │   └── person_repository.py       (NEW - CRUD operations)
│   └── services/
│       └── person_service.py          (NEW - Business logic)
└── tests/
    ├── test_person_model.py           (NEW)
    ├── test_person_repository.py      (NEW)
    └── test_person_api.py             (NEW)
```

### API Endpoints to Add
```python
# In /intelgraph/api.py

@app.post("/v1/persons", response_model=PersonEntityV1, status_code=201)
async def create_person(person: PersonEntityV1):
    """Create or update person entity (idempotent upsert)"""
    pass

@app.get("/v1/persons/{person_id}", response_model=PersonEntityV1)
async def get_person(person_id: str):
    """Get person by ID"""
    pass

@app.get("/v1/persons/{person_id}/network", response_model=GetPersonNetworkResponseV1)
async def get_person_network(
    person_id: str,
    depth: int = Query(1, ge=1, le=3),
    include_metadata: bool = True
):
    """Get person and their association network"""
    pass
```

### Neo4j Cypher Examples
```cypher
// Upsert Person (idempotent by email or id)
MERGE (p:Person {id: $id})
ON CREATE SET
  p.name = $name,
  p.email = $email,
  p.createdAt = $createdAt,
  p.source = $source,
  p.confidence = $confidence
ON MATCH SET
  p.name = $name,
  p.updatedAt = $updatedAt,
  p.confidence = CASE WHEN $confidence > p.confidence THEN $confidence ELSE p.confidence END
RETURN p

// Get Person Network (depth 1)
MATCH (p:Person {id: $personId})
OPTIONAL MATCH (p)-[r:ASSOCIATED_WITH]-(related:Person)
RETURN p, collect({edge: r, person: related}) as associations
```

### Tests
- Unit tests for Person model validation
- Repository tests for CRUD operations (use Neo4j test container)
- API contract tests (validate response against unified contracts)
- Integration test: upsert → query → verify

### Definition of Done
- [ ] Person model implemented in Neo4j
- [ ] Idempotent upsert by ID (prefer) or email
- [ ] Query person + network (depth 1-3)
- [ ] All tests pass (unit + contract + integration)
- [ ] API responses validate against contracts
- [ ] CHANGELOG entry
- [ ] Rollback note: Revert API endpoints, remove Neo4j constraints

### Commit Message
```
feat(intelgraph): canonical person entity + upsert API

- Add Person Neo4j model with metadata fields
- Implement idempotent upsert (merge by ID/email)
- Add GET /v1/persons/{id} endpoint
- Add GET /v1/persons/{id}/network endpoint (depth 1-3)
- Add PersonRepository with Neo4j Cypher queries
- Add PersonService for business logic
- Include unit + contract + integration tests
- Integrate with unified contracts package

This implements IG-101 canonical graph model for the
Person entity type with associations.

Refs: IG-101
```

---

## PR-3: Switchboard - Person Ingestion + Idempotency + Provenance
**Theme:** Ingest person data into IntelGraph with provenance tracking

### Scope
Add ingestion endpoint to Switchboard that:
1. Accepts normalized person payloads (CSV, HTTP, etc.)
2. Validates against unified contracts
3. Enriches with provenance metadata
4. Calls IntelGraph upsert API (idempotent)
5. Deduplicates by (source_id, stable_key, payload_hash)

### Files to Modify/Create
```
/ingestion/
├── requirements.txt                   (MODIFY - add httpx, contracts)
├── main.py                            (MODIFY - add person ingestion route)
├── ingestors/
│   └── person_ingestor.py             (NEW)
├── adapters/
│   └── intelgraph_adapter.py          (NEW - HTTP client for IG)
├── services/
│   ├── provenance_service.py          (NEW - Enrich provenance metadata)
│   └── idempotency_service.py         (NEW - Dedupe logic)
└── tests/
    ├── test_person_ingestor.py        (NEW)
    ├── test_provenance_service.py     (NEW)
    └── test_intelgraph_adapter.py     (NEW)
```

### API Endpoints to Add
```python
# In /ingestion/main.py

@app.post("/v1/ingest/persons", response_model=IngestPersonResponseV1)
async def ingest_persons(request: IngestPersonRequestV1):
    """
    Ingest person data into IntelGraph
    - Validates payload against contracts
    - Enriches provenance metadata
    - Deduplicates by hash
    - Calls IntelGraph upsert API
    """
    pass
```

### Idempotency Strategy
```python
def compute_payload_hash(persons: List[PersonEntityV1]) -> str:
    """Compute stable hash of person payload for dedupe"""
    canonical = json.dumps(
        [p.dict(exclude={'metadata'}) for p in persons],
        sort_keys=True
    )
    return hashlib.sha256(canonical.encode()).hexdigest()

async def check_idempotency(source_id: str, correlation_id: str, payload_hash: str) -> bool:
    """Return True if already processed"""
    query = """
        SELECT 1 FROM switchboard.ingestion_log
        WHERE source_id = $1 AND correlation_id = $2 AND payload_hash = $3
    """
    result = await db.fetchval(query, source_id, correlation_id, payload_hash)
    return result is not None
```

### Provenance Enrichment
```python
def enrich_provenance(person: PersonEntityV1, source: SourceMetadata) -> PersonEntityV1:
    """Add provenance metadata"""
    person.metadata.source = source.id
    person.metadata.confidence = compute_confidence(source.type, person)
    person.metadata.ingestedAt = datetime.utcnow().isoformat()
    return person
```

### Tests
- Unit tests for idempotency service (hash computation)
- Unit tests for provenance enrichment
- Integration test: POST ingestion → verify IntelGraph entity created
- Contract tests: Validate request/response payloads

### Definition of Done
- [ ] POST /v1/ingest/persons endpoint implemented
- [ ] Idempotency by (source_id, correlation_id, payload_hash)
- [ ] Provenance metadata enriched before IG upsert
- [ ] IntelGraph adapter with retry logic
- [ ] All tests pass (unit + integration + contract)
- [ ] CHANGELOG entry
- [ ] Rollback note: Disable endpoint, clear ingestion_log table

### Commit Message
```
feat(switchboard): person ingestion + idempotency + provenance

- Add POST /v1/ingest/persons endpoint
- Implement idempotency by (source_id, correlation_id, payload_hash)
- Add provenance enrichment (source, confidence, ingestion_time)
- Add IntelGraph HTTP adapter with retry logic
- Add ingestion_log table for dedupe tracking
- Include unit + integration + contract tests
- Integrate with unified contracts package

This implements SB-33 ingestion into canonical graph model
with safe replay guarantees.

Refs: SB-33, IG-101
```

---

## PR-4: Maestro - Person Network Analysis Workflow
**Theme:** Orchestrate person network analysis across IntelGraph

### Scope
Create a minimal workflow that:
1. Accepts person ID + analysis depth
2. Queries IntelGraph for person network
3. Generates summary (stubbed AI or simple text)
4. Returns workflow run record

### Files to Modify/Create
```
/orchestration/
├── runtime/
│   ├── internal/
│   │   └── actions/
│   │       ├── intelgraph_query.go    (NEW - Call IG API)
│   │       └── summarize.go           (NEW - Generate summary)
│   └── cmd/chronosd/main.go           (MODIFY - Register actions)
└── workflows/
    └── person-network-analysis.yaml   (NEW)
```

### Workflow Spec
```yaml
# /orchestration/workflows/person-network-analysis.yaml
apiVersion: chronos.v1
kind: Workflow
metadata:
  name: person-network-analysis
  namespace: integration
  version: v1
spec:
  inputs:
    - name: personId
      type: string
      required: true
    - name: analysisDepth
      type: integer
      default: 2

  tasks:
    - id: query-network
      uses: intelgraph/query-person-network
      with:
        personId: ${{ inputs.personId }}
        depth: ${{ inputs.analysisDepth }}
        includeMetadata: true

    - id: summarize
      uses: ai/summarize-network
      needs: [query-network]
      with:
        person: ${{ tasks.query-network.outputs.person }}
        associations: ${{ tasks.query-network.outputs.associations }}

    - id: return-result
      uses: core/return
      needs: [summarize]
      with:
        person: ${{ tasks.query-network.outputs.person }}
        networkSize: ${{ tasks.query-network.outputs.metadata.resultCount }}
        summary: ${{ tasks.summarize.outputs.summary }}
        associations: ${{ tasks.query-network.outputs.associations }}

  retries:
    default:
      strategy: exponential
      maxAttempts: 3
      baseMs: 500
```

### Go Action Implementations
```go
// /orchestration/runtime/internal/actions/intelgraph_query.go
package actions

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
)

type IntelGraphQueryAction struct {
    baseURL string
    client  *http.Client
}

func (a *IntelGraphQueryAction) Execute(ctx context.Context, params map[string]interface{}) (map[string]interface{}, error) {
    personID := params["personId"].(string)
    depth := int(params["depth"].(float64))

    url := fmt.Sprintf("%s/v1/persons/%s/network?depth=%d", a.baseURL, personID, depth)

    resp, err := a.client.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result, nil
}
```

### Tests
- Workflow compilation test (YAML → DAG IR)
- Action unit tests (mock IntelGraph responses)
- Integration test: Start workflow → verify completion + outputs

### Definition of Done
- [ ] person-network-analysis workflow defined
- [ ] IntelGraph query action implemented
- [ ] Summarize action implemented (stub or simple)
- [ ] POST /v1/start accepts workflow + inputs
- [ ] GET /v1/status/{runId} returns outputs
- [ ] All tests pass (unit + integration)
- [ ] CHANGELOG entry
- [ ] Rollback note: Remove workflow file, unregister actions

### Commit Message
```
feat(maestro): person-network-analysis workflow

- Add person-network-analysis workflow (YAML spec)
- Implement intelgraph/query-person-network action
- Implement ai/summarize-network action (stub)
- Register actions in chronosd runtime
- Add workflow compilation + execution tests
- Integrate with unified contracts package

This implements MC-205 orchestration layer for the
person network analysis use case.

Refs: MC-205, IG-101
```

---

## PR-5: CompanyOS - POST /v1/insights/person-network Endpoint
**Theme:** Product-facing API endpoint for person network insights

### Scope
Add a single endpoint that:
1. Accepts person ID + analysis depth
2. Calls Maestro to run person-network-analysis workflow
3. Polls workflow status (or use callback)
4. Returns insight result with entities, edges, and summary

### Files to Modify/Create
```
/companyos/
├── src/
│   ├── api/
│   │   ├── index.ts                   (MODIFY - Mount insights router)
│   │   └── insightsRoutes.ts          (NEW)
│   ├── services/
│   │   └── insightsService.ts         (NEW - Business logic)
│   ├── adapters/
│   │   └── maestroAdapter.ts          (NEW - HTTP client for Maestro)
│   └── middleware/
│       └── auth.ts                     (MODIFY - Add auth stub if needed)
└── services/companyos-api/tests/
    ├── insights.test.ts                (NEW)
    └── integration/
        └── e2e-person-network.test.ts  (NEW - Full stack test)
```

### API Endpoint
```typescript
// /companyos/src/api/insightsRoutes.ts
import { Router } from 'express'
import { InsightsService } from '../services/insightsService'

const router = Router()
const service = new InsightsService()

router.post('/v1/insights/person-network', async (req, res) => {
  try {
    const { personId, depth = 2 } = req.body

    // Validate request against contract
    const validated = CreatePersonNetworkInsightRequestV1.parse(req.body)

    // Call Maestro to run workflow
    const insight = await service.createPersonNetworkInsight(personId, depth)

    // Validate response against contract
    const response = CreatePersonNetworkInsightResponseV1.parse(insight)

    res.status(201).json(response)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### Service Implementation
```typescript
// /companyos/src/services/insightsService.ts
import { MaestroAdapter } from '../adapters/maestroAdapter'
import { v4 as uuidv4 } from 'uuid'

export class InsightsService {
  private maestro: MaestroAdapter

  constructor() {
    this.maestro = new MaestroAdapter(process.env.MAESTRO_URL!)
  }

  async createPersonNetworkInsight(personId: string, depth: number) {
    const insightId = uuidv4()

    // Start Maestro workflow
    const workflowRun = await this.maestro.startWorkflow({
      workflow: 'person-network-analysis',
      inputs: { personId, analysisDepth: depth }
    })

    // Poll for completion (or use callback/webhook)
    const result = await this.maestro.waitForCompletion(workflowRun.runId, {
      timeout: 30000,
      interval: 1000
    })

    // Transform to API response
    return {
      version: 'v1',
      insightId,
      person: result.person,
      network: {
        size: result.networkSize,
        associations: result.associations
      },
      summary: result.summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        maestroRunId: workflowRun.runId
      }
    }
  }
}
```

### Tests
- Unit tests for InsightsService (mock Maestro adapter)
- API endpoint tests (supertest)
- E2E integration test:
  1. POST CSV to Switchboard → wait for ingestion
  2. POST /v1/insights/person-network → verify response
  3. Validate entire flow (SB → IG → MC → CO)

### Definition of Done
- [ ] POST /v1/insights/person-network endpoint implemented
- [ ] MaestroAdapter with workflow start + polling
- [ ] Auth middleware stub (or JWT validation)
- [ ] Unit + API + E2E tests pass
- [ ] Response validates against unified contracts
- [ ] CHANGELOG entry
- [ ] Rollback note: Remove insights routes, disable endpoint

### Commit Message
```
feat(companyos): POST /v1/insights/person-network endpoint

- Add POST /v1/insights/person-network endpoint
- Implement InsightsService with Maestro integration
- Add MaestroAdapter (HTTP client with polling)
- Add auth middleware stub for RBAC hook
- Include unit + API + E2E integration tests
- Integrate with unified contracts package

This implements CO-58 product-facing API endpoint for
person network insights, completing the critical path:
Switchboard → IntelGraph → Maestro → CompanyOS.

Refs: CO-58, MC-205, IG-101, SB-33
```

---

## PR-6: Integration Harness + CI Gate
**Theme:** Full-stack testing and contract drift prevention

### Scope
1. Docker Compose harness for local integration testing
2. CI job that runs contract + integration + smoke tests
3. Contract drift gate (prevent incompatible changes without version bump)

### Files to Create/Modify
```
/
├── docker-compose.integration.yml     (NEW)
├── .github/workflows/
│   └── integration-tests.yml          (NEW)
├── scripts/
│   ├── run-integration-tests.sh       (NEW)
│   └── check-contract-drift.sh        (NEW)
└── tests/integration/
    ├── smoke.test.ts                  (NEW)
    └── contract-drift.test.ts         (NEW)
```

### Docker Compose Harness
```yaml
# docker-compose.integration.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: integration_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5.15-community
    environment:
      NEO4J_AUTH: neo4j/testpass
    healthcheck:
      test: ["CMD-SHELL", "wget --spider http://localhost:7474 || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  intelgraph:
    build: ./intelgraph
    environment:
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: testpass
      REDIS_URL: redis://redis:6379
    depends_on:
      neo4j:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5

  maestro:
    build: ./orchestration/runtime
    environment:
      PG_DSN: postgres://postgres:testpass@postgres:5432/integration_test
      INTELGRAPH_URL: http://intelgraph:8000
    depends_on:
      postgres:
        condition: service_healthy
      intelgraph:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --spider http://localhost:8080/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5

  switchboard:
    build: ./ingestion
    environment:
      PG_DSN: postgres://postgres:testpass@postgres:5432/integration_test
      INTELGRAPH_URL: http://intelgraph:8000
    depends_on:
      postgres:
        condition: service_healthy
      intelgraph:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8001/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5

  companyos:
    build: ./companyos
    environment:
      DATABASE_URL: postgres://postgres:testpass@postgres:5432/integration_test
      MAESTRO_URL: http://maestro:8080
    depends_on:
      postgres:
        condition: service_healthy
      maestro:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:4100/health || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5

  integration-tests:
    build: ./tests/integration
    environment:
      SWITCHBOARD_URL: http://switchboard:8001
      INTELGRAPH_URL: http://intelgraph:8000
      MAESTRO_URL: http://maestro:8080
      COMPANYOS_URL: http://companyos:4100
    depends_on:
      switchboard:
        condition: service_healthy
      intelgraph:
        condition: service_healthy
      maestro:
        condition: service_healthy
      companyos:
        condition: service_healthy
    command: pnpm test
```

### Smoke Test
```typescript
// tests/integration/smoke.test.ts
import { describe, it, expect } from 'vitest'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

describe('Integration Smoke Test: Full Critical Path', () => {
  it('should complete full flow: Switchboard → IntelGraph → Maestro → CompanyOS', async () => {
    const correlationId = uuidv4()
    const personId = uuidv4()

    // Step 1: Ingest person via Switchboard
    const ingestResponse = await axios.post(
      `${process.env.SWITCHBOARD_URL}/v1/ingest/persons`,
      {
        version: 'v1',
        correlationId,
        source: { id: 'smoke-test', name: 'Smoke Test', type: 'manual' },
        provenance: {
          ingestedAt: new Date().toISOString(),
          confidence: 1.0
        },
        payload: {
          persons: [{
            id: personId,
            type: 'Person',
            version: 'v1',
            attributes: { name: 'Alice Smith', email: 'alice@example.com' },
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: 'smoke-test',
              confidence: 1.0
            }
          }]
        }
      }
    )

    expect(ingestResponse.status).toBe(200)
    expect(ingestResponse.data.result.success).toBe(true)

    // Step 2: Verify entity in IntelGraph
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for async processing

    const igResponse = await axios.get(
      `${process.env.INTELGRAPH_URL}/v1/persons/${personId}`
    )

    expect(igResponse.status).toBe(200)
    expect(igResponse.data.attributes.name).toBe('Alice Smith')

    // Step 3: Request person network insight via CompanyOS
    const insightResponse = await axios.post(
      `${process.env.COMPANYOS_URL}/v1/insights/person-network`,
      {
        version: 'v1',
        personId,
        depth: 1
      }
    )

    expect(insightResponse.status).toBe(201)
    expect(insightResponse.data.person.id).toBe(personId)
    expect(insightResponse.data.summary).toBeDefined()
    expect(insightResponse.data.metadata.maestroRunId).toBeDefined()

    // Validate response against contract
    const validated = CreatePersonNetworkInsightResponseV1.parse(insightResponse.data)
    expect(validated).toBeDefined()
  }, 60000) // 60s timeout
})
```

### Contract Drift Check
```bash
#!/bin/bash
# scripts/check-contract-drift.sh

set -e

echo "Checking for contract drift..."

# Generate JSON schemas from Zod validators
cd contracts/integration
pnpm run generate-schemas

# Compare with previous commit
git diff --exit-code src/v1/*.json || {
  echo "ERROR: Contract schemas changed without version bump!"
  echo "Please increment the version in package.json if this is intentional."
  exit 1
}

echo "✓ No contract drift detected"
```

### CI Workflow
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:
    branches: [main, claude/**]
  push:
    branches: [main]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run contract tests
        run: pnpm --filter @summit/contracts test

      - name: Check contract drift
        run: ./scripts/check-contract-drift.sh

  integration-tests:
    runs-on: ubuntu-latest
    needs: contract-tests
    steps:
      - uses: actions/checkout@v4

      - name: Start integration environment
        run: docker compose -f docker-compose.integration.yml up -d --build

      - name: Wait for services
        run: |
          timeout 120 bash -c 'until docker compose -f docker-compose.integration.yml ps | grep -q "healthy"; do sleep 2; done'

      - name: Run smoke tests
        run: docker compose -f docker-compose.integration.yml run integration-tests

      - name: Tear down
        if: always()
        run: docker compose -f docker-compose.integration.yml down -v
```

### Definition of Done
- [ ] Docker Compose harness runs all services
- [ ] Smoke test passes locally and in CI
- [ ] Contract drift check prevents incompatible changes
- [ ] CI workflow runs on all PRs to main/claude/**
- [ ] CHANGELOG entry
- [ ] Rollback note: Remove integration test infrastructure

### Commit Message
```
test(integration): full-stack harness + CI gate

- Add docker-compose.integration.yml for local testing
- Add smoke test validating full critical path:
  Switchboard → IntelGraph → Maestro → CompanyOS
- Add contract drift check preventing breaking changes
- Add GitHub Actions workflow for integration tests
- Include health checks and service dependencies
- Add scripts for running integration tests locally

This completes the integration critical path with
automated testing and contract drift prevention.

Refs: IG-101, MC-205, CO-58, SB-33
```

---

## Implementation Order

1. **PR-1** (Contracts) - Foundation for all others
2. **PR-2** (IntelGraph) - Depends on PR-1
3. **PR-3** (Switchboard) - Depends on PR-1, PR-2
4. **PR-4** (Maestro) - Depends on PR-1, PR-2
5. **PR-5** (CompanyOS) - Depends on PR-1, PR-2, PR-4
6. **PR-6** (Integration) - Depends on all above

---

## Success Criteria (Final)

After PR-6 merges:
- ✅ End-to-end flow operational
- ✅ Contract tests prevent drift
- ✅ Integration tests run in CI
- ✅ All services versioned at v1
- ✅ Rollback strategy documented
- ✅ Atomic PRs (each shippable independently with feature flags if needed)

---

## Rollback Strategy (Global)

If critical path fails in production:
1. Disable CompanyOS endpoint via feature flag
2. Revert PR-6, PR-5, PR-4, PR-3, PR-2, PR-1 in reverse order
3. Each PR includes rollback notes in commit message
4. Database migrations include down scripts
5. Neo4j constraints can be dropped without data loss

---

## Notes

- **Keep scope minimal:** One entity, one edge, one workflow, one endpoint
- **No refactors:** Add adapters, don't rewrite existing code
- **Contract-first:** Define schemas before implementation
- **Test coverage:** Unit + contract + integration for each PR
- **Version all APIs:** Use `/v1/` prefix, plan for `/v2/` migration path
- **Document rollback:** Each PR commit message includes rollback notes
