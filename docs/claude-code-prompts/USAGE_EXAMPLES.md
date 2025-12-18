# Claude Code Prompts - Usage Examples

> Real-world scenarios showing how to use the prompt library effectively.

## Table of Contents
- [Scenario 1: Starting a New Microservice](#scenario-1-starting-a-new-microservice)
- [Scenario 2: Performance Investigation](#scenario-2-performance-investigation)
- [Scenario 3: Pre-Production Security Review](#scenario-3-pre-production-security-review)
- [Scenario 4: Cost Spike Investigation](#scenario-4-cost-spike-investigation)
- [Scenario 5: Adding Data Provenance](#scenario-5-adding-data-provenance)
- [Scenario 6: Implementing Multi-Tenancy](#scenario-6-implementing-multi-tenancy)

---

## Scenario 1: Starting a New Microservice

**Context**: You need to build a new microservice for processing intelligence reports.

### Step-by-Step Workflow

#### Phase 1: Foundation (Day 1, Morning)

```bash
# 1. Verify monorepo structure exists, or bootstrap if needed
# Skip if already set up
/bootstrap-monorepo
```

**Customization**:
- Add `services/report-processor` to the workspace
- Configure service-specific Dockerfile

**Result**: New service directory with TypeScript, build configs, and container setup

---

#### Phase 2: API Design (Day 1, Afternoon)

```bash
# 2. Define GraphQL API for report operations
/graphql-gateway
```

**Customization**:
```graphql
# Add to schema
type Report {
  id: ID!
  title: String!
  content: String!
  classification: String!
  entities: [Entity!]!
  createdAt: DateTime!
}

type Query {
  report(id: ID!): Report
  reports(filter: ReportFilter): [Report!]!
}

type Mutation {
  createReport(input: CreateReportInput!): Report!
  processReport(id: ID!): ProcessingJob!
}
```

**Result**: API endpoints, resolvers, and integration with Neo4j/PostgreSQL

---

#### Phase 3: Data Processing (Day 2, Morning)

```bash
# 3. Set up ingest connector for report documents
/ingest-connectors
```

**Customization**:
- Configure S3 bucket for report uploads
- Add document parsing logic (PDF, DOCX)
- Attach provenance: source, upload timestamp, submitter

**Result**: Report ingestion pipeline with 50 MB/s throughput

---

#### Phase 4: Observability (Day 2, Afternoon)

```bash
# 4. Add monitoring and dashboards
/observability
```

**Customization**:
- Metrics: `report_processing_duration_seconds`, `report_errors_total`
- Dashboard: Report processing throughput and error rates
- Alerts: Processing failures > 5% error rate

**Result**: Full observability stack with SLO tracking

---

#### Phase 5: Testing (Day 3)

```bash
# 5. Implement comprehensive tests
/testing-strategy
```

**Customization**:
- Unit tests for report parsing logic
- Integration tests with Neo4j (entity extraction)
- E2E tests for upload → process → query workflow
- Load test: 1,000 concurrent report uploads

**Result**: Test suite with >80% coverage and SLO validation

---

#### Phase 6: Deployment (Day 3, Afternoon)

```bash
# 6. Set up CI/CD pipeline
/cicd-pipeline
```

**Result**: Automated deployment with security gates and canary rollout

---

### Timeline
- **Total**: 3 days
- **Code written by Claude**: ~80%
- **Your customization**: ~20% (domain logic, business rules)

---

## Scenario 2: Performance Investigation

**Context**: GraphQL queries are slow (p95 = 800ms, target = 350ms)

### Investigation Workflow

#### Step 1: Add Observability

```bash
/observability
```

**Focus**:
- Distributed tracing to identify slow components
- Metrics for each resolver (database, cache, external API)

**Findings** (example):
```
Trace analysis shows:
- Neo4j relationship query: 600ms (p95)
- PostgreSQL metadata fetch: 150ms (p95)
- Redis cache: 10ms (p95)

Root cause: Missing Neo4j index on relationship.purpose
```

---

#### Step 2: Optimize Graph Queries

```bash
/neo4j-schema
```

**Actions**:
- Add composite index on `(type, purpose, createdAt)`
- Refactor Cypher to use index hints
- Profile queries with EXPLAIN

**Code Example**:
```cypher
// Before (600ms)
MATCH (e:Entity)-[r:CONNECTED_TO]->(target)
WHERE r.purpose = $purpose
  AND r.createdAt >= datetime($startDate)
RETURN target

// After (120ms) - with index
CREATE INDEX rel_purpose_date IF NOT EXISTS
FOR ()-[r:CONNECTED_TO]-()
ON (r.purpose, r.createdAt);

MATCH (e:Entity)-[r:CONNECTED_TO]->(target)
USING INDEX r:CONNECTED_TO(purpose, createdAt)
WHERE r.purpose = $purpose
  AND r.createdAt >= datetime($startDate)
RETURN target
```

---

#### Step 3: Validate with Load Tests

```bash
/testing-strategy
```

**Focus**: k6 load tests

```javascript
// tests/load/graphql-optimized.js
export const options = {
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<350'],  // SLO
  },
};
```

**Result**: p95 drops from 800ms → 280ms ✅

---

## Scenario 3: Pre-Production Security Review

**Context**: Security team requires threat model and evidence before production launch

### Security Sprint Workflow

#### Day 1: Threat Modeling

```bash
/threat-model
```

**Deliverables**:
- STRIDE analysis for all data flows
- DFDs (Mermaid diagrams)
- Abuse cases (insider threat, data exfiltration, etc.)
- Controls matrix mapping threats → mitigations → tests

**Review**: Present threat model to security team

---

#### Day 2: Policy Implementation

```bash
/opa-policies
```

**Deliverables**:
- Rego policies for tenant isolation
- Purpose-based access control
- Retention tier enforcement
- PII redaction rules

**Validation**:
- Policy simulation tests pass
- Integration tests verify ABAC enforcement

---

#### Day 3: Evidence Collection

```bash
/cicd-pipeline  # SBOM + security scanning
/provenance-ledger  # Audit trail
```

**Deliverables**:
- SBOM (CycloneDX) attached to release
- Trivy scan results (no HIGH/CRITICAL vulnerabilities)
- Provenance ledger with immutable audit trail
- SLSA Level 3 attestations

**Review**: Security team approves based on evidence

---

## Scenario 4: Cost Spike Investigation

**Context**: AWS bill jumped from $5k → $15k/month

### Cost Investigation Workflow

#### Step 1: Implement Cost Tracking

```bash
/cost-guardrails
```

**Deliverables**:
- Usage metering for all operations
- Cost dashboard in Grafana
- Budget alerts at 80% threshold

---

#### Step 2: Analyze Cost Drivers

**Dashboard Analysis**:
```
Top Cost Drivers (last 7 days):
1. Neo4j queries: $8,000 (80% increase from last week)
   - Tenant "acme-corp": 5M queries (up from 500k)
   - Operation: 3-hop relationship discovery

2. S3 storage: $3,000 (stable)

3. Compute (ECS): $2,500 (stable)
```

**Root Cause**: Acme Corp launched new investigation with unbounded graph queries

---

#### Step 3: Implement Guardrails

**Actions**:
1. Add query complexity limits in GraphQL
2. Implement rate limiting for expensive operations
3. Add tenant-specific quotas

**Code Example**:
```typescript
// libs/cost/src/quotas.ts
export const tenantQuotas = {
  'acme-corp': {
    graphQueriesPerDay: 100_000,  // Down from unlimited
    maxHopCount: 2,                // Down from 3
  },
};
```

---

#### Step 4: Validate Cost Reduction

**Load Test**:
```bash
/testing-strategy
```

**Result**: Projected monthly cost drops from $15k → $6k ✅

---

## Scenario 5: Adding Data Provenance

**Context**: Compliance requires full audit trail for all data operations

### Provenance Implementation

#### Step 1: Implement Ledger

```bash
/provenance-ledger
```

**Deliverables**:
- Append-only ledger with hash-chaining
- CLI for export/verify
- Signed export bundles

---

#### Step 2: Integrate with Ingest

```bash
/ingest-connectors
```

**Customization**:
```typescript
// Attach provenance to every ingested entity
interface ProvenanceMetadata {
  sourceId: 'connector-s3-csv-001',
  sourceUri: 's3://data-lake/reports/2024-01/report-123.csv',
  contentHash: 'sha256:abc123...',
  ingestedAt: '2024-01-15T10:30:00Z',
  ingestedBy: 'analyst-alice',
  purpose: 'investigation-456',
}
```

---

#### Step 3: Export for Compliance

```bash
# Generate signed export bundle
provenance export \
  --investigation inv-456 \
  --output ./compliance-bundle.tar.gz \
  --sign-key ./private-key.pem
```

**Result**: Tamper-evident export bundle with full chain-of-custody

---

## Scenario 6: Implementing Multi-Tenancy

**Context**: SaaS launch requires strict tenant isolation

### Multi-Tenancy Workflow

#### Step 1: Define Isolation Policies

```bash
/opa-policies
```

**Deliverables**:
```rego
# policy/tenant-isolation.rego
package intelgraph.tenant

default allow = false

allow if {
    input.user.tenantId == input.resource.tenantId
}

deny["Tenant mismatch"] if {
    input.user.tenantId != input.resource.tenantId
}
```

---

#### Step 2: Update GraphQL Gateway

```bash
/graphql-gateway
```

**Customization**:
```typescript
// Add tenant context to all requests
app.use((req, res, next) => {
  const tenantId = extractTenantFromJWT(req.headers.authorization);
  req.context = { ...req.context, tenantId };
  next();
});

// Enforce in resolvers
const entityResolvers = {
  Query: {
    entities: async (_, args, context) => {
      // OPA policy check
      await authorizeOPA({
        user: { tenantId: context.tenantId },
        resource: { tenantId: args.tenantId },
        operation: 'READ',
      });

      return entityService.findByTenant(context.tenantId);
    },
  },
};
```

---

#### Step 3: Validate Isolation

```bash
/testing-strategy
```

**Tests**:
- Unit test: OPA policy denies cross-tenant access
- Integration test: Query from tenant A cannot see tenant B's data
- E2E test: Full user journey with tenant switching

**Result**: Multi-tenant SaaS with proven isolation ✅

---

## Pro Tips

### Combining Prompts Effectively

**Pattern 1: Bottom-Up (Data → API → UI)**
```
/neo4j-schema → /graphql-gateway → /observability
```

**Pattern 2: Top-Down (Requirements → Implementation)**
```
/threat-model → /opa-policies → /graphql-gateway
```

**Pattern 3: Cross-Cutting Concerns**
```
/observability + /cost-guardrails + /testing-strategy
(Run in parallel for all services)
```

---

### Iterating on Prompts

1. **First pass**: Execute prompt as-is to get scaffolding
2. **Second pass**: Customize for your domain (business logic, schemas)
3. **Third pass**: Optimize based on profiling and load tests
4. **Fourth pass**: Harden based on security review

---

### Maintaining Context

When using multiple prompts:
```bash
# Save context between prompts
echo "Investigation service: reports → entities → relationships" > .context

# Reference in next prompt
"Given context in .context, update the GraphQL schema to support..."
```

---

## Next Steps

After implementing these scenarios:
1. **Document** your customizations in runbooks
2. **Share** learnings with the team
3. **Contribute** improvements back to prompt library
4. **Automate** common workflows with custom slash commands

**Questions?** See [README.md](./README.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md).
