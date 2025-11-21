# Service Catalog Template

## Purpose
This template provides a standardized format for documenting each service in the Summit/IntelGraph platform.

---

## Service Overview

| Field | Value |
|-------|-------|
| **Service Name** | `[e.g., graph-core, api-gateway, nlp-service]` |
| **Display Name** | `[Human-readable name]` |
| **Team Owner** | `[Team name/Slack channel]` |
| **Primary Contact** | `[@github-username, email]` |
| **On-Call Rotation** | `[PagerDuty schedule or "N/A"]` |
| **Source Repository** | `[GitHub repo path]` |
| **Service Type** | `[API / Worker / Cron / Data Pipeline]` |
| **Language/Runtime** | `[Node.js 20 / Python 3.11 / Go 1.21]` |
| **Deployment Status** | `[Production / Staging / Experimental]` |

---

## Endpoints & Ports

| Port | Protocol | Purpose | Health Check |
|------|----------|---------|--------------|
| `3000` | HTTP | Main API | `GET /health` |
| `9090` | HTTP | Metrics | `GET /metrics` (Prometheus format) |
| `[port]` | `[protocol]` | `[purpose]` | `[endpoint]` |

**Base URLs:**
- **Production:** `https://[service].example.com`
- **Staging:** `https://[service].staging.example.com`
- **Local:** `http://localhost:[port]`

---

## Purpose & Responsibilities

### What This Service Does
`[2-3 sentence description of the service's core purpose]`

**Example:**
> The Graph Core service provides a GraphQL API for interacting with the Neo4j graph database. It handles all entity and relationship CRUD operations, enforces schema validation, and optimizes Cypher queries for performance.

### Key Capabilities
- `[Capability 1: e.g., Entity creation and retrieval]`
- `[Capability 2: e.g., Relationship traversal queries]`
- `[Capability 3: e.g., Graph analytics (centrality, community detection)]`

### What This Service Does NOT Do
- `[Explicitly state out-of-scope responsibilities]`
- `[e.g., "Does not handle authentication - relies on authz-gateway"]`

---

## Dependencies

### Upstream Dependencies (Services This Service Calls)
| Service | Purpose | Fallback Behavior |
|---------|---------|-------------------|
| `neo4j` | Graph database | Return cached data or 503 |
| `redis` | Query caching | Degrades gracefully (no cache) |
| `[service]` | `[purpose]` | `[fallback]` |

### Downstream Consumers (Services That Call This Service)
- `api-gateway` - Routes all GraphQL requests
- `copilot` - Queries for context retrieval
- `[service]` - `[reason]`

### External Dependencies
- **Neo4j 5.x** - Graph database (critical)
- **Redis 7.x** - Cache layer (non-critical)
- **Kafka** - Event streaming (critical)

---

## API Reference

### GraphQL Schema
```graphql
type Query {
  entity(id: ID!): Entity
  entities(filter: EntityFilter): [Entity!]!
}

type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
}

type Entity {
  id: ID!
  name: String!
  type: EntityType!
  properties: JSON
  relationships: [Relationship!]!
}
```

**Full Schema:** `[Link to GraphQL Playground or schema file]`

### REST Endpoints (if applicable)
| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| `GET` | `/api/v1/entities` | List entities | ✅ Yes (JWT) |
| `POST` | `/api/v1/entities` | Create entity | ✅ Yes (JWT) |

---

## Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEO4J_URI` | ✅ | - | Neo4j connection string |
| `NEO4J_USER` | ✅ | - | Database username |
| `NEO4J_PASSWORD` | ✅ | - | Database password |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis cache URL |
| `LOG_LEVEL` | ❌ | `info` | Logging verbosity (debug/info/warn/error) |
| `PORT` | ❌ | `3000` | HTTP server port |

### Feature Flags
| Flag | Purpose | Default |
|------|---------|---------|
| `ENABLE_QUERY_CACHE` | Enable Redis query caching | `true` |
| `ENABLE_TRACING` | Enable OpenTelemetry tracing | `true` |

---

## Deployment

### Local Development
```bash
# Start dependencies
docker-compose up neo4j redis

# Install dependencies
pnpm install

# Run service
pnpm run dev
```

### Docker
```bash
docker build -t graph-core:latest .
docker run -p 3000:3000 --env-file .env graph-core:latest
```

### Kubernetes
```bash
helm install graph-core ./helm/graph-core \
  --set image.tag=v1.2.3 \
  --set replicas=3
```

**Helm Chart:** `[Path to Helm chart]`

---

## Observability

### Metrics
- **Prometheus Endpoint:** `http://localhost:9090/metrics`
- **Key Metrics:**
  - `http_request_duration_seconds` - Request latency histogram
  - `graph_query_duration_seconds` - Neo4j query duration
  - `redis_cache_hit_rate` - Cache hit rate percentage
  - `active_connections` - Current active connections

### Logs
- **Format:** Structured JSON
- **Location:** `stdout` (captured by Kubernetes/Docker)
- **Log Levels:** `debug`, `info`, `warn`, `error`, `fatal`

### Tracing
- **Provider:** Jaeger (OpenTelemetry)
- **Trace Endpoint:** `http://localhost:4318/v1/traces`
- **Trace ID Header:** `X-Trace-ID`

### Dashboards
- **Grafana:** `[Link to Grafana dashboard]`
- **Key Panels:**
  - Request rate (req/s)
  - Error rate (%)
  - P95 latency (ms)
  - Database connection pool usage

---

## SLOs & SLAs

### Service Level Objectives
| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Availability** | 99.9% uptime | 30 days |
| **Latency (P95)** | < 200ms | 24 hours |
| **Error Rate** | < 0.1% | 24 hours |

### Service Level Agreements (External)
`[If this service has SLAs with external customers, document them here]`

---

## Operations

### Health Checks
- **Liveness:** `GET /health/live` - Returns 200 if service is running
- **Readiness:** `GET /health/ready` - Returns 200 if service can accept traffic
- **Dependency Check:** `GET /health/dependencies` - Returns status of all dependencies

### Scaling
- **Horizontal Scaling:** ✅ Supported (stateless)
- **Vertical Scaling:** ⚠️ Limited (memory-bound for large queries)
- **Auto-scaling:** HPA based on CPU (target: 70%)

### Common Operations
1. **Restart Service:**
   ```bash
   kubectl rollout restart deployment/graph-core -n production
   ```

2. **Scale Replicas:**
   ```bash
   kubectl scale deployment/graph-core --replicas=5 -n production
   ```

3. **View Logs:**
   ```bash
   kubectl logs -f deployment/graph-core -n production --tail=100
   ```

---

## Troubleshooting

### Common Issues

#### Issue: High Memory Usage
**Symptoms:** Pod OOMKilled, high heap usage
**Cause:** Large query results not paginated
**Resolution:**
1. Check query for missing pagination
2. Increase memory limit temporarily
3. Optimize query to use `LIMIT` clause

**Runbook:** `docs/runbooks/graph-core-memory.md`

---

#### Issue: Slow Query Performance
**Symptoms:** P95 latency > 1s
**Cause:** Missing Neo4j indexes
**Resolution:**
1. Check query plan: `EXPLAIN MATCH ...`
2. Create missing indexes: `CREATE INDEX entity_name FOR (n:Entity) ON (n.name)`
3. Monitor index usage in Neo4j Browser

**Runbook:** `docs/runbooks/graph-core-performance.md`

---

#### Issue: Connection Pool Exhausted
**Symptoms:** Errors: "No available connections"
**Cause:** Connection leaks or insufficient pool size
**Resolution:**
1. Check for unclosed connections in logs
2. Increase pool size: `NEO4J_MAX_CONNECTIONS=100`
3. Review code for proper connection handling

**Runbook:** `docs/runbooks/graph-core-connections.md`

---

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
pnpm run dev

# Enable query logging
export NEO4J_QUERY_LOGGING=true
```

---

## Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
docker-compose -f docker-compose.test.yml up -d
pnpm test:integration
```

### Load Testing
```bash
k6 run tests/load/graph-query-load.js
```

**Test Coverage:** `[Current coverage: e.g., 85%]`

---

## Security

### Authentication
- **Method:** JWT tokens (validated by authz-gateway)
- **Token Validation:** Delegated to upstream gateway

### Authorization
- **Method:** OPA policies
- **Policy Location:** `opa/policies/graph-core.rego`
- **Enforcement:** Row-level security in Neo4j queries

### Secrets Management
- **Production:** AWS Secrets Manager / HashiCorp Vault
- **Local:** `.env` file (not committed to Git)

### Compliance
- **SOC2:** Audit logs enabled
- **GDPR:** PII encryption at rest and in transit

---

## Links

- **Source Code:** `[GitHub repo URL]`
- **CI/CD Pipeline:** `[GitHub Actions workflow URL]`
- **Runbooks:** `docs/runbooks/graph-core/`
- **API Documentation:** `[GraphQL Playground URL]`
- **Monitoring Dashboard:** `[Grafana URL]`
- **Incident Postmortems:** `docs/postmortems/graph-core/`

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-01-15 | v1.2.3 | Added query caching | @johndoe |
| 2025-01-01 | v1.2.0 | Neo4j 5.x upgrade | @janedoe |
| 2024-12-15 | v1.1.0 | GraphQL Federation support | @engineer |

---

## Questions?
- **Slack:** `#team-platform`
- **Email:** `platform-team@example.com`
- **On-Call:** Page via PagerDuty `graph-core-oncall`
