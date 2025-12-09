# Admin Studio GraphQL API

Comprehensive GraphQL API for cost/budget management, monitoring, and operational control of the IntelGraph platform.

## Features

- 💰 **Budget Management** - Create and monitor tenant budgets
- 📊 **Cost Tracking** - Track spending by tenant, operation, and resource
- 🚨 **QOS Overrides** - Temporary budget overrides with TTL
- 📝 **Tenant Notices** - Warning and notification system
- 🔍 **Query Monitoring** - Real-time running query visibility
- ⚡ **Slow Query Killer** - Automatic query termination
- 🏥 **Service Health** - Multi-service health monitoring
- 📈 **System Metrics** - CPU, memory, and performance metrics
- 🎯 **Feature Flags** - Runtime feature toggles
- 🔄 **Connector Jobs** - Job status and retry management
- 📏 **SLO Adherence** - Service level objective tracking
- 🔔 **Real-time Subscriptions** - WebSocket subscriptions for live updates

## Quick Start

### Installation

```bash
cd services/admin-api
pnpm install
```

### Environment Variables

```bash
# Server
ADMIN_API_PORT=4100
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/summit

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Query Budgets
DEFAULT_QUERY_TIMEOUT_MS=30000
DEFAULT_QUERY_MAX_COST=1.0
```

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /health/detailed` | Detailed health with dependencies |
| `GET /metrics` | Prometheus metrics |
| `POST /graphql` | GraphQL queries and mutations |
| `WS /graphql` | GraphQL subscriptions |

## GraphQL Schema

### Queries

#### Budget Management
```graphql
query GetTenantBudget {
  tenantBudget(tenantId: "tenant-123", period: DAY) {
    id
    tenantId
    period
    limit
    current
    remaining
    utilizationPercent
    resetAt
  }
}

query ListBudgets {
  tenantBudgets(limit: 50, offset: 0) {
    id
    tenantId
    period
    utilizationPercent
  }
}

query GetBudgetHistory {
  budgetLedgerEntries(
    tenantId: "tenant-123"
    startDate: "2025-01-01T00:00:00Z"
    endDate: "2025-01-31T23:59:59Z"
    limit: 100
  ) {
    id
    operation
    estimatedCost
    actualCost
    resourceType
    createdAt
  }
}
```

#### Cost Analytics
```graphql
query GetCostMetrics {
  costMetrics(tenantId: "tenant-123", period: DAY) {
    totalCost
    costByOperation
    costByResource
    requestCount
    avgCostPerRequest
  }
}

query GetTopSpenders {
  aggregatedCostMetrics(period: DAY, topN: 10) {
    tenantId
    totalCost
    requestCount
  }
}
```

#### Query Monitoring
```graphql
query GetRunningQueries {
  runningQueries(tenantId: "tenant-123") {
    queryId
    database
    query
    estimatedCost
    complexity
    executionTimeMs
    costIncurred
    status
    startedAt
  }
}

query GetSlowQueryStats {
  slowQueryStats(tenantId: "tenant-123", period: DAY) {
    totalQueries
    killedQueries
    warningsIssued
    totalCostSaved
    avgExecutionTimeMs
    p95ExecutionTimeMs
    p99ExecutionTimeMs
  }
}
```

#### System Health
```graphql
query GetServiceHealth {
  serviceHealth {
    service
    status
    uptime
    lastCheck
  }
}

query GetSystemMetrics {
  systemMetrics {
    cpuUsagePercent
    memoryUsageBytes
    memoryUsagePercent
    activeConnections
    requestRate
    errorRate
    p95LatencyMs
  }
}
```

#### Feature Flags
```graphql
query GetFeatureFlags {
  featureFlags {
    id
    name
    enabled
    rolloutPercent
    tenantWhitelist
    tenantBlacklist
  }
}

query GetFeatureFlag {
  featureFlag(name: "new-ui-dashboard") {
    enabled
    rolloutPercent
  }
}
```

### Mutations

#### Budget Management
```graphql
mutation SetBudget {
  setTenantBudget(
    tenantId: "tenant-123"
    period: DAY
    limit: 100.0
  ) {
    id
    limit
    current
    utilizationPercent
  }
}

mutation RecordSpending {
  recordSpending(
    tenantId: "tenant-123"
    operation: "graph_query"
    estimatedCost: 0.05
    actualCost: 0.048
    resourceType: "compute"
    metadata: { query: "MATCH (n) RETURN n" }
  ) {
    id
    actualCost
  }
}
```

#### QOS Overrides
```graphql
mutation CreateOverride {
  createQOSOverride(
    tenantId: "tenant-123"
    exploreMax: 0.95
    ttlMinutes: 1440
    reason: "Premium tier upgrade"
  ) {
    id
    expiresAt
  }
}

mutation ExtendOverride {
  extendQOSOverride(
    id: "override-123"
    extendMinutes: 720
    reason: "Extended for additional testing"
  ) {
    id
    expiresAt
  }
}
```

#### Query Management
```graphql
mutation KillQuery {
  killQuery(queryId: "query-abc-123")
}

mutation SetQueryBudget {
  setTenantQueryBudget(
    tenantId: "tenant-123"
    maxExecutionTimeMs: 5000
    maxCostDollars: 0.10
    maxConcurrentQueries: 10
    maxComplexity: 50
  )
}
```

#### Feature Flags
```graphql
mutation ToggleFeature {
  toggleFeatureFlag(name: "new-ui-dashboard", enabled: true) {
    enabled
    updatedAt
  }
}

mutation UpdateRollout {
  updateFeatureFlagRollout(
    name: "new-ui-dashboard"
    rolloutPercent: 25
    tenantWhitelist: ["tenant-vip-1", "tenant-vip-2"]
  ) {
    rolloutPercent
    tenantWhitelist
  }
}
```

### Subscriptions

```graphql
subscription WatchBudget {
  budgetUtilizationChanged(tenantId: "tenant-123") {
    utilizationPercent
    remaining
  }
}

subscription WatchQueryWarnings {
  queryWarnings(tenantId: "tenant-123") {
    queryId
    executionTimeMs
    costIncurred
    status
  }
}

subscription WatchQueryKills {
  queryKills {
    queryId
    tenantId
    reason
  }
}

subscription WatchSystemMetrics {
  systemMetricsUpdated {
    cpuUsagePercent
    memoryUsagePercent
    requestRate
    errorRate
  }
}
```

## Integration Examples

### JavaScript/TypeScript Client

```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4100/graphql',
  cache: new InMemoryCache(),
});

// Get tenant budget
const { data } = await client.query({
  query: gql`
    query {
      tenantBudget(tenantId: "tenant-123", period: DAY) {
        utilizationPercent
        remaining
      }
    }
  `,
});

console.log(`Budget utilization: ${data.tenantBudget.utilizationPercent}%`);
console.log(`Remaining: $${data.tenantBudget.remaining}`);
```

### WebSocket Subscriptions

```typescript
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4100/graphql',
  })
);

// Subscribe to budget changes
client.subscribe({
  query: gql`
    subscription {
      budgetUtilizationChanged(tenantId: "tenant-123") {
        utilizationPercent
        remaining
      }
    }
  `,
}).subscribe({
  next: (data) => {
    console.log('Budget updated:', data);
  },
});
```

### cURL Examples

```bash
# Query tenant budget
curl -X POST http://localhost:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { tenantBudget(tenantId: \"tenant-123\", period: DAY) { utilizationPercent remaining } }"
  }'

# Set budget
curl -X POST http://localhost:4100/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { setTenantBudget(tenantId: \"tenant-123\", period: DAY, limit: 100.0) { id limit } }"
  }'

# Health check
curl http://localhost:4100/health

# Prometheus metrics
curl http://localhost:4100/metrics
```

## Monitoring & Observability

### Prometheus Metrics

The service exposes standard IntelGraph metrics:

- `intelgraph_http_requests_total` - Total HTTP requests
- `intelgraph_http_request_duration_seconds` - Request latency
- `intelgraph_http_errors_total` - HTTP errors
- `intelgraph_graphql_requests_total` - GraphQL requests
- `intelgraph_budget_utilization_percent` - Budget utilization
- `intelgraph_slow_queries_killed_total` - Slow queries killed

### Health Checks

```bash
# Basic health
curl http://localhost:4100/health

# Detailed health with dependency status
curl http://localhost:4100/health/detailed
```

### Logging

Structured JSON logs are written to stdout:

```json
{
  "level": "info",
  "message": "Query killed",
  "queryId": "query-abc-123",
  "tenantId": "tenant-123",
  "reason": "Exceeded max execution time",
  "executionTimeMs": 6000,
  "costSaved": 0.05
}
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY dist ./dist
EXPOSE 4100
CMD ["node", "dist/index.js"]
```

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-api
spec:
  selector:
    app: admin-api
  ports:
    - name: http
      port: 4100
      targetPort: 4100
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-api
  template:
    metadata:
      labels:
        app: admin-api
    spec:
      containers:
        - name: admin-api
          image: intelgraph/admin-api:latest
          ports:
            - containerPort: 4100
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: url
          livenessProbe:
            httpGet:
              path: /health
              port: 4100
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/detailed
              port: 4100
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Security

### Authentication

The API expects a JWT token in the `Authorization` header:

```bash
Authorization: Bearer <jwt-token>
```

### Authorization

- **Admin role required** for all mutations
- **Tenant isolation** enforced via JWT claims
- **RBAC** via Open Policy Agent (OPA) integration

### Rate Limiting

Configured via environment variables:

```bash
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per minute
```

## License

MIT
