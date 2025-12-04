---
id: DQ-001
name: Data Quality & Stewardship Command Center
slug: data-quality-dashboard
category: ops
subcategory: observability
priority: high
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Builds a comprehensive DQ dashboard service that computes completeness,
  consistency, timeliness, duplication, and provenance coverage per dataset/connector.

objective: |
  Deliver a production-ready data quality monitoring system with OpenTelemetry
  integration, policy-labeled alerts, and steward workflows.

tags:
  - data-quality
  - observability
  - governance
  - stewardship
  - opentelemetry

dependencies:
  services:
    - postgresql
    - opentelemetry-collector
    - prometheus
    - grafana
  packages:
    - "@intelgraph/db"
    - "@intelgraph/telemetry"
    - "@intelgraph/policy"

deliverables:
  - type: service
    description: DQ dashboard service with REST/GraphQL API
  - type: metrics
    description: OpenTelemetry metrics export
  - type: alerts
    description: Policy-labeled anomaly alert rules
  - type: workflows
    description: Steward workflows (owner→custodian→ombuds)
  - type: tests
    description: Golden IO test suite
  - type: documentation
    description: README with SLO examples

acceptance_criteria:
  - description: DQ metrics computed for all datasets/connectors
    validation: Query Prometheus for dq_completeness, dq_consistency metrics
  - description: Alert rules configured and firing correctly
    validation: Trigger test anomaly, verify alert delivery
  - description: Steward workflows operational
    validation: Complete owner→custodian→ombuds workflow in test env
  - description: Test coverage > 80%
    validation: Run jest --coverage
  - description: make smoke passes
    validation: make smoke

estimated_effort: 3-5 days
complexity: medium

related_prompts:
  - OPS-001
  - GOV-001
  - XAI-001

blueprint_path: ../blueprints/templates/service
---

# Data Quality & Stewardship Command Center

## Objective

Build a comprehensive data quality (DQ) dashboard service that continuously monitors and reports on data health across all datasets and connectors in the Summit/IntelGraph platform. The service must integrate deeply with the existing observability stack and provide actionable insights to data stewards.

## Prompt

**Build a DQ dashboard service that computes completeness, consistency, timeliness, duplication, and provenance coverage per dataset/connector. Include:**

### Core Requirements

**(a) OpenTelemetry Metrics Export**
- Compute and export the following DQ dimensions as OTel metrics:
  - **Completeness**: Percentage of non-null required fields per dataset
  - **Consistency**: Cross-field validation failures (e.g., date ranges, referential integrity)
  - **Timeliness**: Data freshness (time since last update vs. expected cadence)
  - **Duplication**: Detected duplicate records (exact + fuzzy matching)
  - **Provenance Coverage**: Percentage of records with complete chain-of-custody
- All metrics tagged with: `dataset_id`, `connector_name`, `policy_label`
- Expose via `/metrics` endpoint for Prometheus scraping
- Support both batch (scheduled) and streaming (event-driven) computation

**(b) Policy-Labeled Anomaly Alerts**
- Integrate with OPA policy engine to retrieve dataset policy labels
- Define alert thresholds per policy tier (e.g., classified data has tighter SLOs)
- Generate alerts when DQ metrics fall below thresholds:
  - Example: `dq_completeness{policy_label="classified"} < 0.95` → PagerDuty alert
- Support custom alert routing based on stewardship roles
- Include runbook links in alert payloads

**(c) Contradiction Density Chart**
- Detect contradictory records (same entity, conflicting attributes, overlapping validity periods)
- Visualize contradiction density over time per dataset
- Link contradictions to provenance records for root-cause analysis
- Expose via GraphQL query: `contradictionDensity(datasetId: ID!, timeRange: DateRange!)`

**(d) Steward Workflows (Owner → Custodian → Ombuds)**
- Implement role-based workflow for DQ issue resolution:
  1. **Owner**: Receives DQ alert, reviews issue
  2. **Custodian**: Investigates root cause, proposes remediation
  3. **Ombuds**: Adjudicates disputes, approves data corrections
- Each step logged to audit trail with provenance
- UI (React components) for workflow state machine
- GraphQL mutations: `assignDQIssue`, `escalateToOmbuds`, `resolveDQIssue`

### Technical Specifications

**Service Structure** (following Summit conventions):
```
services/dq-dashboard/
├── src/
│   ├── metrics/          # OTel metrics computation
│   ├── detectors/        # Anomaly/contradiction detection
│   ├── workflows/        # Steward workflow engine
│   ├── graphql/          # Schema and resolvers
│   └── api/              # REST endpoints
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/         # Golden test datasets
├── Dockerfile
├── package.json
└── README.md
```

**GraphQL Schema** (extend existing):
```graphql
type DQMetrics {
  datasetId: ID!
  completeness: Float!
  consistency: Float!
  timeliness: Float!
  duplication: Float!
  provenanceCoverage: Float!
  timestamp: DateTime!
}

type DQIssue {
  id: ID!
  datasetId: ID!
  dimension: DQDimension!
  severity: Severity!
  status: WorkflowStatus!
  assignee: User
  resolution: String
}

enum DQDimension {
  COMPLETENESS
  CONSISTENCY
  TIMELINESS
  DUPLICATION
  PROVENANCE_COVERAGE
}

enum WorkflowStatus {
  PENDING_OWNER
  PENDING_CUSTODIAN
  PENDING_OMBUDS
  RESOLVED
  DISPUTED
}

extend type Query {
  dqMetrics(datasetId: ID!, timeRange: DateRange): [DQMetrics!]!
  contradictionDensity(datasetId: ID!, timeRange: DateRange!): [DataPoint!]!
  dqIssues(filters: DQIssueFilter): [DQIssue!]!
}

extend type Mutation {
  assignDQIssue(issueId: ID!, userId: ID!): DQIssue!
  escalateToOmbuds(issueId: ID!, reason: String!): DQIssue!
  resolveDQIssue(issueId: ID!, resolution: String!): DQIssue!
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE dq_metrics (
  id SERIAL PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  completeness FLOAT,
  consistency FLOAT,
  timeliness FLOAT,
  duplication FLOAT,
  provenance_coverage FLOAT,
  policy_label TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dq_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  assignee_id UUID,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dq_workflow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES dq_issues(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_id UUID NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Deliverables Checklist

- [x] Service implementation with DQ computation engine
- [x] OpenTelemetry metrics export (all 5 dimensions)
- [x] Prometheus alert rules (alert-rules.yml)
- [x] Contradiction density detector and GraphQL query
- [x] Steward workflow state machine
- [x] GraphQL schema extensions and resolvers
- [x] React components for steward UI
- [x] PostgreSQL migrations
- [x] Golden IO test suite with fixtures
- [x] README with:
  - Setup instructions
  - SLO examples (e.g., "95% completeness for classified data")
  - Runbook links
  - API documentation
- [x] Helm chart for Kubernetes deployment
- [x] CI/CD pipeline (GitHub Actions)

### Acceptance Criteria

1. **Metrics Validation**
   - [ ] Run service against golden test dataset
   - [ ] Verify all 5 DQ metrics computed correctly
   - [ ] Confirm metrics appear in Prometheus UI with correct labels

2. **Alerts Validation**
   - [ ] Inject anomaly into test dataset (e.g., drop completeness to 80%)
   - [ ] Verify alert fires and routes to correct steward
   - [ ] Check alert payload includes runbook link

3. **Workflow Validation**
   - [ ] Create test DQ issue
   - [ ] Complete full workflow: Owner → Custodian → Ombuds → Resolved
   - [ ] Verify each transition logged to audit trail
   - [ ] Check provenance chain includes all workflow steps

4. **Integration Validation**
   - [ ] Service integrates with existing `@intelgraph/api` via GraphQL federation
   - [ ] Policy labels fetched from OPA correctly
   - [ ] Provenance records link to `prov-ledger` service

5. **Golden Path**
   - [ ] `make smoke` passes with DQ service running
   - [ ] No regressions in existing functionality

### Test Scenarios

#### Scenario 1: Completeness Detection
```json
{
  "dataset": "test-entities-001",
  "records": 1000,
  "missing_fields": {
    "name": 50,
    "type": 0,
    "provenance_id": 100
  },
  "expected_completeness": 0.85
}
```

#### Scenario 2: Contradiction Detection
```json
{
  "entity_id": "e-123",
  "records": [
    {"attr": "nationality", "value": "US", "valid_from": "2020-01-01"},
    {"attr": "nationality", "value": "UK", "valid_from": "2020-01-01"}
  ],
  "expected_contradiction": true
}
```

#### Scenario 3: Steward Workflow
```yaml
steps:
  - actor: owner
    action: review
    outcome: assign_to_custodian
  - actor: custodian
    action: investigate
    outcome: propose_fix
  - actor: ombuds
    action: approve
    outcome: resolved
expected_audit_entries: 3
```

## Implementation Notes

### Integration with Existing Services

**Provenance Ledger**
- Query provenance coverage via `prov-ledger` API
- Link DQ issues to provenance chain for root-cause analysis

**Policy Engine (OPA)**
- Fetch dataset policy labels on DQ computation
- Use labels to determine alert thresholds and routing

**Audit Service**
- Publish workflow transitions as audit events
- Ensure steward actions are logged with actor identity

### Performance Considerations

- **Batch Processing**: Use cron jobs for scheduled DQ scans (off-peak hours)
- **Streaming**: Subscribe to dataset update events for real-time DQ updates
- **Caching**: Cache policy labels (TTL: 5 minutes) to reduce OPA calls
- **Indexing**: Index `dq_metrics(dataset_id, computed_at)` for fast time-range queries

### Security & Authorization

- **Steward Roles**: Define RBAC roles (`dq:owner`, `dq:custodian`, `dq:ombuds`)
- **Dataset Access**: Enforce existing dataset authorization rules
- **Audit**: All DQ actions must pass through audit middleware

### Configuration

Example `.env` entries:
```bash
DQ_DASHBOARD_PORT=8090
DQ_BATCH_SCHEDULE="0 2 * * *"  # 2 AM daily
DQ_ALERT_WEBHOOK_URL=https://pagerduty.example.com/webhook
DQ_COMPLETENESS_THRESHOLD_CLASSIFIED=0.95
DQ_COMPLETENESS_THRESHOLD_UNCLASSIFIED=0.85
```

## References

- [Data Quality Dimensions (Wikipedia)](https://en.wikipedia.org/wiki/Data_quality)
- [OpenTelemetry Metrics API](https://opentelemetry.io/docs/specs/otel/metrics/api/)
- [Summit Architecture](/home/user/summit/docs/ARCHITECTURE.md)
- [CLAUDE.md](/home/user/summit/CLAUDE.md)

## Related Prompts

- **OPS-001**: Runbook Engine (for DQ runbook automation)
- **GOV-001**: Policy Change Simulator (for testing policy label impacts)
- **XAI-001**: XAI Integrity Overlays (for DQ issue explanations)
