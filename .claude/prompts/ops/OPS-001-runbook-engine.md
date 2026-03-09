---
id: OPS-001
name: Runbook Engine - Author, Test, Replay
slug: runbook-engine
category: ops
subcategory: reliability
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Implements a minimal runbook engine where each runbook is a DAG with assumptions,
  legal basis, KPIs, and replayable logs. Provides CLI for testing and replaying
  operational procedures.

objective: |
  Deliver production-ready runbook automation with test/replay capabilities,
  acceptance packs, and load testing integration.

tags:
  - runbooks
  - ops
  - automation
  - dag
  - testing
  - k6

dependencies:
  services:
    - postgresql
  packages:
    - "@intelgraph/workflow"
    - "@intelgraph/audit"
  external:
    - "graphlib@^2.1.0"
    - "k6@^0.48.0"

deliverables:
  - type: service
    description: Runbook execution engine with DAG orchestration
  - type: cli
    description: CLI tool for rb test|replay|validate
  - type: tests
    description: k6 load tests and acceptance packs
  - type: documentation
    description: Runbook authoring guide and examples

acceptance_criteria:
  - description: Runbook DAG executes correctly with fixtures
    validation: rb test <runbook> --fixture golden-scenarios.json
  - description: Replay produces identical results
    validation: rb replay <execution-id> | diff - expected-output.json
  - description: Screenshot diffs for UI steps pass
    validation: Compare screenshots using pixelmatch
  - description: Load tests pass (p95 < 2s)
    validation: k6 run load-test.js

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - DQ-001
  - GOV-001

blueprint_path: ../blueprints/templates/service
---

# Runbook Engine: Author → Test → Replay (Ops-Ready)

## Objective

Create a production-ready runbook engine that treats operational procedures as code. Each runbook is a directed acyclic graph (DAG) of steps with explicit assumptions, legal basis, KPIs, and full replay capability. This enables teams to test runbooks against fixtures, replay past executions for audit, and validate changes don't break existing procedures.

## Prompt

**Implement a minimal runbook engine where each runbook is a DAG with assumptions, legal basis, KPIs, and replayable logs. Provide a CLI `rb test|replay` that runs ingest→resolve→report on fixtures, plus screenshot diffs for UI steps. Include acceptance packs and k6 load tests.**

### Core Requirements

**(a) Runbook Definition Format**

Runbooks are defined in YAML with the following structure:

```yaml
---
id: rb-001-entity-enrichment
name: Entity Enrichment Pipeline
version: 1.0.0
owner: analytics-team
legal_basis: "Per IC Policy 12.3, automated enrichment authorized for FOUO data"

assumptions:
  - source_data_validated: true
  - api_credentials_valid: true
  - entity_schema_v2: true

kpis:
  max_duration_seconds: 300
  min_success_rate: 0.95
  max_error_rate: 0.05

steps:
  - id: ingest
    type: data_fetch
    description: "Fetch entities from source API"
    inputs:
      source_url: "${SOURCE_API_URL}"
      auth_token: "${API_TOKEN}"
    outputs:
      entities: "$.data.entities"
    on_failure: abort

  - id: validate
    type: schema_check
    description: "Validate entity schema"
    depends_on: [ingest]
    inputs:
      entities: "${steps.ingest.outputs.entities}"
      schema: "entity-v2.json"
    outputs:
      valid_entities: "$.valid"
      errors: "$.errors"
    on_failure: log_and_continue

  - id: enrich
    type: api_call
    description: "Enrich entities via graph API"
    depends_on: [validate]
    inputs:
      entities: "${steps.validate.outputs.valid_entities}"
      endpoint: "/graphql"
      query: "enrichment-query.graphql"
    outputs:
      enriched: "$.data.enrichEntities"

  - id: report
    type: metrics_publish
    description: "Publish KPIs to Prometheus"
    depends_on: [enrich]
    inputs:
      metrics:
        entities_processed: "${len(steps.enrich.outputs.enriched)}"
        duration_seconds: "${execution.duration}"
    outputs:
      published: true

  - id: screenshot_ui
    type: ui_screenshot
    description: "Capture UI state for visual regression"
    depends_on: [enrich]
    inputs:
      url: "http://localhost:3000/entities"
      selector: "#entity-list"
    outputs:
      screenshot_path: "$.screenshot"
```

**(b) CLI: `rb test|replay|validate`**

Implement a CLI tool with the following commands:

**`rb test <runbook-id> --fixture <fixture-file>`**
- Execute runbook against fixture data
- Validate all assumptions met
- Check KPIs against thresholds
- Generate execution report
- Exit code 0 on success, 1 on failure

Example:
```bash
rb test rb-001-entity-enrichment --fixture fixtures/golden-scenarios.json
# Output:
# ✓ Assumption: source_data_validated
# ✓ Step: ingest (200 entities fetched)
# ✓ Step: validate (195 valid, 5 errors)
# ✓ Step: enrich (195 enriched)
# ✓ Step: report (metrics published)
# ✓ KPI: max_duration_seconds (120s < 300s)
# ✓ KPI: min_success_rate (0.975 > 0.95)
# ✓ Screenshot diff: 0.01% change (within threshold)
# PASS
```

**`rb replay <execution-id>`**
- Fetch execution log from database
- Re-run runbook with recorded inputs
- Compare outputs with original execution
- Flag any deviations

Example:
```bash
rb replay exec-2025-11-29-abc123
# Output:
# ✓ Step: ingest (200 entities, matches original)
# ✓ Step: validate (195 valid, matches original)
# ✓ Step: enrich (195 enriched, matches original)
# ✓ Screenshot diff: 0.00% change (identical)
# REPLAY VERIFIED
```

**`rb validate <runbook-file>`**
- Parse runbook YAML
- Check DAG for cycles
- Validate step dependencies
- Verify all inputs/outputs defined
- Check for unused variables

**(c) DAG Execution Engine**

- Use `graphlib` or similar for DAG representation
- Topological sort for execution order
- Parallel execution where possible (no dependencies)
- Step retry logic (configurable retries, backoff)
- Rollback on critical failures
- Real-time progress updates

**(d) Screenshot Diffing for UI Steps**

- Use Playwright for UI automation
- Capture screenshots at specified selectors
- Use `pixelmatch` for image comparison
- Store baseline screenshots in `tests/screenshots/`
- Flag visual regressions (threshold: 1% pixel diff)
- Include diff images in test reports

**(e) Replayable Execution Logs**

Store all executions in PostgreSQL:

```sql
CREATE TABLE runbook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_id TEXT NOT NULL,
  runbook_version TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT, -- success, failure, aborted
  actor_id UUID,
  metadata JSONB
);

CREATE TABLE runbook_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES runbook_executions(id),
  step_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT,
  inputs JSONB,
  outputs JSONB,
  errors JSONB
);
```

**(f) Acceptance Packs**

Each runbook must include:
- `acceptance.yml`: Test scenarios and expected outcomes
- `fixtures/`: Input data for tests
- `expected/`: Expected outputs for validation
- `screenshots/`: Baseline screenshots

Example `acceptance.yml`:
```yaml
scenarios:
  - name: "Happy path - 200 entities"
    fixture: fixtures/200-entities.json
    expected:
      status: success
      kpis:
        entities_processed: 195
        duration_seconds: "<= 300"
      screenshots:
        entity-list: "screenshots/baseline-entity-list.png"

  - name: "Partial failure - schema errors"
    fixture: fixtures/malformed-entities.json
    expected:
      status: success
      errors:
        count: "> 0"
        type: "schema_validation"
```

**(g) k6 Load Tests**

Generate k6 load test for each runbook:

```javascript
// load-test.js (auto-generated)
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // ramp-up
    { duration: '3m', target: 50 },  // sustained load
    { duration: '1m', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.05'],    // <5% errors
  },
};

export default function () {
  const res = http.post('http://localhost:8080/api/runbooks/execute', JSON.stringify({
    runbook_id: 'rb-001-entity-enrichment',
    inputs: { /* ... */ }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'execution succeeded': (r) => JSON.parse(r.body).status === 'success',
  });
}
```

### Technical Specifications

**Service Structure**:
```
services/runbook-engine/
├── src/
│   ├── engine/           # DAG executor
│   ├── cli/              # CLI commands
│   ├── steps/            # Step type implementations
│   ├── replay/           # Replay logic
│   └── diff/             # Screenshot diffing
├── tests/
│   ├── runbooks/         # Example runbooks
│   ├── fixtures/         # Test data
│   ├── screenshots/      # Baseline screenshots
│   └── acceptance/       # Acceptance packs
├── scripts/
│   └── generate-load-test.js
├── Dockerfile
├── package.json
└── README.md
```

**GraphQL Schema**:
```graphql
type Runbook {
  id: ID!
  name: String!
  version: String!
  owner: String!
  legalBasis: String
  steps: [RunbookStep!]!
}

type RunbookExecution {
  id: ID!
  runbookId: ID!
  status: ExecutionStatus!
  startedAt: DateTime!
  completedAt: DateTime
  stepLogs: [StepLog!]!
  kpis: JSON
}

enum ExecutionStatus {
  RUNNING
  SUCCESS
  FAILURE
  ABORTED
}

extend type Query {
  runbook(id: ID!): Runbook
  runbookExecution(id: ID!): RunbookExecution
}

extend type Mutation {
  executeRunbook(id: ID!, inputs: JSON): RunbookExecution!
  replayExecution(executionId: ID!): RunbookExecution!
}
```

### Deliverables Checklist

- [x] Runbook engine with DAG executor
- [x] CLI: `rb test|replay|validate`
- [x] Step type implementations (data_fetch, api_call, ui_screenshot, etc.)
- [x] PostgreSQL schema for execution logs
- [x] Screenshot diffing with Playwright + pixelmatch
- [x] Acceptance pack template and examples
- [x] k6 load test generator
- [x] GraphQL API for execution management
- [x] Example runbooks (3+ scenarios)
- [x] README with authoring guide
- [x] CI/CD integration (run acceptance tests on PR)

### Acceptance Criteria

1. **DAG Execution**
   - [ ] Execute example runbook with 5+ steps
   - [ ] Verify topological order respected
   - [ ] Confirm parallel execution where possible

2. **CLI Validation**
   - [ ] `rb test` passes with golden fixture
   - [ ] `rb replay` produces identical results
   - [ ] `rb validate` catches cycles and missing deps

3. **Screenshot Diffing**
   - [ ] Baseline screenshot captured
   - [ ] Intentional UI change flagged (>1% diff)
   - [ ] Identical replay passes (<0.01% diff)

4. **Load Testing**
   - [ ] k6 test completes with p95 < 2s
   - [ ] Error rate < 5%

5. **Integration**
   - [ ] Executions logged to audit service
   - [ ] Metrics published to Prometheus
   - [ ] `make smoke` passes

## Implementation Notes

### Step Types

Implement these core step types:
- `data_fetch`: HTTP API calls
- `schema_check`: JSON schema validation
- `api_call`: GraphQL/REST mutations
- `metrics_publish`: Prometheus push
- `ui_screenshot`: Playwright automation
- `sql_query`: Database queries
- `wait`: Delay/polling

### Replay Considerations

- Store inputs/outputs as JSONB for exact replay
- Include environment variables in execution metadata
- Handle non-deterministic steps (timestamps, UUIDs) with placeholders
- Flag external dependencies (API changes) that may affect replay

### Security

- Encrypt sensitive inputs (tokens, credentials)
- Require authorization for runbook execution
- Audit all executions with actor identity
- Support secret injection from Vault/K8s secrets

## References

- [DAG Scheduling (Apache Airflow)](https://airflow.apache.org/docs/apache-airflow/stable/concepts/dags.html)
- [k6 Load Testing](https://k6.io/docs/)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)

## Related Prompts

- **DQ-001**: Data Quality Dashboard (for DQ runbooks)
- **GOV-001**: Policy Change Simulator (for compliance runbooks)
