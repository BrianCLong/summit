# Tenant Graph Slice v0 - Technical Documentation

> **Status**: Production-ready MVP
> **Version**: 0.1.0
> **Last Updated**: 2025-11-27

## Overview

Tenant Graph Slice v0 delivers multi-tenant graph ingestion, storage, and query capabilities with built-in provenance tracking, ABAC security, and SLO compliance.

### Key Features

- **Multi-tenant isolation**: Row-level security + OPA policies
- **High-performance ingest**: ≥1e5 entities/sec/worker with deduplication
- **Fast graph queries**: p95 < 350ms for search, < 300ms for 1-hop neighbors
- **Complete provenance**: Immutable audit trail with hash manifests
- **ABAC security**: OPA-enforced tenant + purpose-based access control
- **Field-level encryption**: PII protection with automatic redaction

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GraphQL API Gateway                     │
│  (Apollo Server + OIDC + OPA ABAC Middleware)               │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
    ┌────────▼────────┐              ┌────────▼────────┐
    │  HTTP Ingest    │              │  Query Resolvers │
    │  Endpoint       │              │  (Search, etc.)  │
    └────────┬────────┘              └────────┬─────────┘
             │                                 │
    ┌────────▼────────────────────────────────▼─────────┐
    │          IngestService + EntityRepo                │
    │  (Stable ID generation, deduplication, upserts)   │
    └────────┬────────────────────────────────┬─────────┘
             │                                 │
  ┌──────────▼──────────┐          ┌──────────▼──────────┐
  │   PostgreSQL        │          │     Neo4j           │
  │  (Source of truth)  │◄─sync────│  (Graph queries)    │
  │  • Entities         │          │  • Full-text index  │
  │  • Relationships    │          │  • Traversal        │
  │  • Provenance       │          └─────────────────────┘
  │  • Outbox (sync)    │
  └─────────────────────┘
```

## Data Model

### Entities

Canonical entity types with stable ID generation:
- **Person**: name, email (PII), phone (PII), nationality
- **Organization**: name, industry, jurisdiction, registration number
- **Asset**: type, description, value, serial number
- **Event**: type, timestamp, location, participants
- **Indicator**: type, value, pattern, confidence, TLP level

**Stable ID Formula**:
```
ID = tenant:kind:SHA256(naturalKeys)
```

Natural keys per type:
- Person: `name + dateOfBirth + nationality`
- Organization: `name + jurisdiction + registrationNumber`
- Asset: `assetType + serialNumber`
- Event: `eventType + timestamp + description`
- Indicator: `indicatorType + value`

### Relationships

Edge types with confidence scores:
- `MEMBER_OF`: Person → Organization
- `OWNS`: Organization → Asset
- `MENTIONED_IN`: Entity → Event
- `RELATED_TO`: Entity → Entity

All relationships include:
- Temporal tracking (first_seen, last_seen)
- Confidence score (0.0-1.0)
- Source attribution
- Provenance ID

### Retention & Privacy

| Entity Type | Has PII | Retention Class | TTL    |
|-------------|---------|-----------------|--------|
| Person      | Yes     | short-30d       | 30 days|
| Person      | No      | standard-365d   | 365 days|
| Organization| No      | standard-365d   | 365 days|
| Asset       | No      | standard-365d   | 365 days|
| Indicator   | No      | long-1095d      | 1095 days|

## API Reference

### GraphQL Queries

#### `entityById`
Get entity by ID with tenant scope.

```graphql
query GetEntity($id: ID!, $tenantId: ID!) {
  entityById(id: $id, tenantId: $tenantId) {
    id
    tenantId
    labels
    ... on Person {
      name
      email  # Redacted unless user has 'investigation' purpose
    }
  }
}
```

**Performance**: p50 < 50ms, p95 < 150ms

#### `searchEntities`
Full-text search across all entity types.

```graphql
query Search($tenantId: ID!, $q: String!, $limit: Int) {
  searchEntities(tenantId: $tenantId, q: $q, limit: $limit) {
    entities {
      id
      labels
      score  # Relevance score
    }
    total
    hasMore
    took   # Query time in ms
  }
}
```

**SLO**: p95 < 350ms, 99.9% availability monthly

#### `neighbors`
Graph traversal with configurable hop depth.

```graphql
query GetNeighbors(
  $id: ID!,
  $tenantId: ID!,
  $hops: Int,
  $filter: NeighborFilter
) {
  neighbors(id: $id, tenantId: $tenantId, hops: $hops, filter: $filter) {
    entities { id labels }
    relationships { fromEntityId toEntityId relationshipType confidence }
    total
    took
  }
}
```

**SLOs**:
- 1-hop: p95 < 300ms
- 2-hop: p95 < 1200ms

### HTTP Ingest API

#### `POST /api/v1/ingest`
Ingest entities and relationships via HTTP.

**Authentication**: JWT Bearer token required
**Authorization**: `ingest:write` permission via OPA

**Request**:
```json
{
  "tenantId": "tenant-001",
  "sourceType": "s3-csv",
  "sourceId": "s3://bucket/data.csv",
  "entities": [
    {
      "externalId": "ext-123",
      "kind": "person",
      "labels": ["Person", "Analyst"],
      "properties": {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "nationality": "US"
      }
    }
  ],
  "relationships": [
    {
      "fromExternalId": "ext-123",
      "toExternalId": "org-456",
      "relationshipType": "MEMBER_OF",
      "confidence": 0.95,
      "properties": {
        "role": "CEO"
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "provenanceId": "prov-uuid",
  "summary": {
    "entitiesCreated": 1000,
    "entitiesUpdated": 50,
    "relationshipsCreated": 800,
    "relationshipsUpdated": 20
  },
  "metadata": {
    "duration": 5420,
    "timestamp": "2025-11-27T12:00:00Z"
  }
}
```

**Rate Limits**: 100 requests per 15 minutes per IP
**Max Payload**: 10,000 entities per request

## CSV Ingest

### Mapping Configuration

Define CSV-to-graph mapping in YAML:

```yaml
version: "1.0"

source:
  type: csv
  delimiter: ","
  hasHeader: true

entities:
  - kind: person
    idField: person_id
    labels: ["Person"]
    fields:
      name:
        csvColumn: full_name
        transform: trim
      email:
        csvColumn: email_address
        transform: lowercase
      nationality:
        csvColumn: country
        transform: uppercase

relationships:
  - type: MEMBER_OF
    fromField: person_id
    toField: org_id
    confidence: 0.95
```

### Supported Transforms

- `uppercase`, `lowercase`, `trim`
- `int`, `float`, `boolean`
- `date` (ISO 8601)
- `json` (parse JSON string)

### CLI Usage

```bash
# Generate golden sample (30 MB)
pnpm tsx scripts/generate-golden-sample.ts

# Ingest CSV with mapping
pnpm tsx scripts/ingest-csv.ts \
  --file ./data/entities.csv \
  --mapping ./data/mapping.yaml \
  --tenant demo-tenant-001

# Run end-to-end demo
./scripts/demo.sh
```

## Security & Compliance

### Multi-Tenancy

**Row-Level Security (RLS)**:
```sql
CREATE POLICY tenant_isolation ON entities
  USING (tenant_id = current_setting('app.current_tenant'));
```

**Application-Level**: All queries enforce `tenantId` parameter

### ABAC (Attribute-Based Access Control)

OPA policies enforce:
- **Tenant isolation**: User can only access their tenant's data
- **Purpose tags**: PII requires 'investigation' or 'threat-intel' purpose
- **Action permissions**: `entity:read`, `ingest:write`, etc.

**Example Policy**:
```rego
allow {
  input.user.tenantId == input.tenantId
  input.action in input.user.scopes
  valid_purpose(input.user.purposes, input.action)
}
```

### PII Protection

Fields marked with `@pii` directive are:
1. **Encrypted at rest** using AES-256-GCM
2. **Redacted in responses** unless user has proper purpose
3. **Subject to short retention** (30 days by default)

**Example Redaction**:
```json
// Without 'investigation' purpose:
{
  "email": "[REDACTED]",
  "phone": "[REDACTED]"
}
```

## SLOs & Monitoring

### Service Level Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Monthly uptime |
| Search latency | p95 < 350ms | Per-query |
| 1-hop neighbors | p95 < 300ms | Per-query |
| 2-hop neighbors | p95 < 1200ms | Per-query |
| Ingest throughput | ≥100k entities/sec | Per worker |

### Metrics

**Prometheus Metrics**:
- `graphql_search_latency_ms{quantile}`
- `graphql_neighbors_latency_ms{hops, quantile}`
- `ingest_entities_created_total`
- `graphql_errors_total{operation}`
- `graphql_slo_violations_total{operation}`

### Dashboards

**Grafana Dashboard**: `observability/dashboards/tenant-graph-v0.json`

Panels:
- Search/neighbors latency (p50, p95, p99)
- Ingest throughput
- Error rates & SLO burn
- Availability gauge
- Neo4j/PostgreSQL health

### Alerts

**SLO Burn Alerts** (50%, 80%, 100% of error budget):
```yaml
- alert: SearchLatencySLOBurn
  expr: histogram_quantile(0.95, rate(graphql_search_latency_ms_bucket[5m])) > 350
  for: 5m
  annotations:
    summary: "Search query p95 latency exceeds 350ms SLO"
```

## Load Testing

### k6 Tests

Run SLO validation:
```bash
k6 run --vus 100 --duration 5m tests/load/tenant-graph-slo.js
```

**Test Scenarios**:
- 50% search queries
- 30% 1-hop neighbor queries
- 20% 2-hop neighbor queries

**Pass Criteria**:
- Error rate < 0.1%
- All SLO thresholds met at p95
- No crashes or memory leaks

### Expected Performance

**Local Development** (MacBook Pro M1):
- Search: p95 ~ 180ms
- 1-hop: p95 ~ 120ms
- 2-hop: p95 ~ 450ms
- Ingest: ~80k entities/sec

**Production** (k8s cluster, 4 replicas):
- Search: p95 ~ 250ms
- 1-hop: p95 ~ 180ms
- 2-hop: p95 ~ 800ms
- Ingest: ~150k entities/sec per worker

## Deployment

### Prerequisites

- PostgreSQL 15+ with `uuid-ossp`, `pgcrypto` extensions
- Neo4j 5.24+ with APOC, GDS plugins
- Redis 7+ for caching
- OPA 0.50+ for policy enforcement

### Database Migrations

```bash
# PostgreSQL
psql -U summit -d summit_dev -f server/src/db/migrations/001_tenant_graph_schema.sql

# Neo4j
cypher-shell -u neo4j -p <password> \
  -f server/src/db/migrations/neo4j/002_tenant_graph_indices.cypher
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://summit:password@localhost:5432/summit_dev
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=<your-secret>
OPA_URL=http://localhost:8181

# Performance
PG_POOL_MAX=20
NEO4J_MAX_CONNECTIONS=50
```

### Docker Compose

```bash
# Start full stack
make up

# Run migrations
pnpm db:migrate

# Run demo
./scripts/demo.sh
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/tenant-graph/

# Check rollout
kubectl rollout status deployment/tenant-graph-api
```

## Troubleshooting

### Common Issues

**Issue**: Search queries slow (>350ms)

*Solutions*:
1. Check Neo4j full-text index: `SHOW INDEXES`
2. Verify index is populated: `CALL db.index.fulltext.queryNodes('entitySearch', 'test')`
3. Increase Neo4j heap: `NEO4J_HEAP_INITIAL=2g NEO4J_HEAP_MAX=4g`

**Issue**: Ingest fails with "entity not found" errors

*Solutions*:
1. Check external ID mapping in CSV
2. Verify entities are created before relationships
3. Review provenance logs: `SELECT * FROM provenance_records WHERE id = 'prov-xxx'`

**Issue**: PII fields not redacted

*Solutions*:
1. Verify user has correct purpose tags
2. Check OPA policies are loaded: `curl http://localhost:8181/v1/policies`
3. Review resolver redaction logic in `tenantGraph.ts`

### Logs

```bash
# API logs
docker logs summit-api --tail 100 -f

# Database logs
docker logs summit-postgres --tail 50

# Neo4j query logs
docker exec summit-neo4j cat /logs/query.log | tail -20
```

## Roadmap

### v0.2 (Next)
- [ ] Streaming ingest (Kafka connector)
- [ ] GraphQL subscriptions (real-time updates)
- [ ] Advanced ER (entity resolution) with ML scoring
- [ ] Multi-region replication

### v1.0 (Future)
- [ ] Temporal graph queries (time-travel)
- [ ] Graph ML (embeddings, link prediction)
- [ ] Federated query across tenants
- [ ] GDPR right-to-erasure automation

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Internal use only

---

**Maintained by**: IntelGraph Engineering
**Support**: [Create an issue](https://github.com/BrianCLong/summit/issues)
