# Service Mesh Best Practices for Summit Platform

> **Document Status**: Production Ready
> **Last Updated**: 2025-11-20
> **Owner**: Platform Engineering Team

## Table of Contents

1. [Service Development](#service-development)
2. [Traffic Management](#traffic-management)
3. [Resilience Patterns](#resilience-patterns)
4. [Observability](#observability)
5. [Security](#security)
6. [Performance](#performance)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Anti-Patterns](#anti-patterns)

---

## Service Development

### 1. Design Services for the Mesh

#### ✅ DO: Implement Health Endpoints

```typescript
// Liveness: Is the service running?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness: Is the service ready to accept traffic?
app.get('/health/ready', async (req, res) => {
  try {
    await db.ping(); // Check dependencies
    await redis.ping();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

#### ✅ DO: Propagate Trace Context

```typescript
import { trace, context } from '@opentelemetry/api';

// Automatic propagation via HTTP headers (no code needed!)
// Headers: traceparent, tracestate, x-b3-traceid, x-correlation-id

// Manual instrumentation for additional context
const span = trace.getActiveSpan();
if (span) {
  span.setAttribute('tenant.id', tenantId);
  span.setAttribute('user.id', userId);
  span.setAttribute('operation.type', 'query');
}
```

#### ✅ DO: Use Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'graph-core',
    version: process.env.APP_VERSION,
  },
  transports: [new winston.transports.Console()],
});

// Log with trace context
logger.info('Entity fetched', {
  entity_id: entityId,
  tenant_id: tenantId,
  duration_ms: duration,
  trace_id: traceId,
  span_id: spanId,
});
```

#### ❌ DON'T: Hardcode Service URLs

```typescript
// ❌ BAD
const response = await fetch('http://10.0.1.45:8080/api/entities');

// ✅ GOOD - Use Kubernetes DNS
const response = await fetch('http://graph-core.summit.svc.cluster.local/api/v1/entities');

// ✅ BETTER - Use environment variables
const GRAPH_CORE_URL = process.env.GRAPH_CORE_URL || 'http://graph-core.summit.svc.cluster.local';
const response = await fetch(`${GRAPH_CORE_URL}/api/v1/entities`);
```

### 2. Graceful Shutdown

#### ✅ DO: Handle SIGTERM Gracefully

```typescript
let server: http.Server;

async function startServer() {
  server = app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, starting graceful shutdown');

    // Stop accepting new requests
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connections
    await db.close();
    await redis.quit();

    // Give in-flight requests time to complete (max 30s)
    setTimeout(() => {
      logger.error('Forcefully shutting down');
      process.exit(1);
    }, 30000);
  });
}
```

### 3. Idempotency

#### ✅ DO: Make Operations Idempotent

```typescript
// Use idempotency keys for mutations
app.post('/api/v1/entities', async (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency key required' });
  }

  // Check if operation already executed
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  // Execute operation
  const result = await createEntity(req.body);

  // Cache result (with expiration)
  await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));

  res.status(201).json(result);
});
```

---

## Traffic Management

### 1. Service Naming

#### ✅ DO: Use Consistent Naming

```
<service-name>.<namespace>.svc.cluster.local
```

Examples:
- `api-gateway.summit.svc.cluster.local`
- `graph-core.summit.svc.cluster.local`
- `nlp-service.summit.svc.cluster.local`

### 2. Versioning

#### ✅ DO: Version Your Services

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graph-core-v2
  labels:
    app: graph-core
    version: v2
spec:
  template:
    metadata:
      labels:
        app: graph-core
        version: v2
```

#### ✅ DO: Use VirtualServices for Version Routing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graph-core-routing
spec:
  hosts:
    - graph-core.summit.svc.cluster.local
  http:
    - match:
        - headers:
            x-api-version:
              exact: v2
      route:
        - destination:
            host: graph-core.summit.svc.cluster.local
            subset: v2
    - route: # Default to v1
        - destination:
            host: graph-core.summit.svc.cluster.local
            subset: v1
          weight: 95
        - destination:
            host: graph-core.summit.svc.cluster.local
            subset: v2
          weight: 5 # 5% canary traffic
```

### 3. Canary Deployments

#### ✅ DO: Start with Small Traffic Percentage

```yaml
# Week 1: 5% canary
- destination:
    host: graph-core.summit.svc.cluster.local
    subset: v2
  weight: 5

# Week 2: 25% canary (if metrics look good)
- destination:
    host: graph-core.summit.svc.cluster.local
    subset: v2
  weight: 25

# Week 3: 50% canary
- destination:
    host: graph-core.summit.svc.cluster.local
    subset: v2
  weight: 50

# Week 4: 100% (promote to stable)
```

#### ✅ DO: Monitor Canary Metrics

- Error rate (should be <0.1%)
- P95 latency (should be <2x baseline)
- CPU/Memory usage
- Custom business metrics

---

## Resilience Patterns

### 1. Circuit Breakers

#### ✅ DO: Configure Circuit Breakers for All External Calls

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-cb
spec:
  host: external-api.example.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
```

#### ✅ DO: Implement Fallback Logic

```typescript
async function fetchEntityWithFallback(entityId: string) {
  try {
    // Primary: Fetch from graph database
    return await graphDb.fetchEntity(entityId);
  } catch (error) {
    logger.warn('Graph DB unavailable, using cache fallback', { error });

    // Fallback: Use cached data
    const cached = await cache.get(`entity:${entityId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Last resort: Return minimal data
    return { id: entityId, status: 'unavailable' };
  }
}
```

### 2. Retries

#### ✅ DO: Retry Transient Failures Only

```yaml
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: 5xx,reset,connect-failure,refused-stream
  # ❌ DON'T retry: 4xx client errors (except 429, 409)
```

#### ✅ DO: Use Exponential Backoff

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * delay * 0.1;

      logger.warn(`Retry attempt ${attempt}/${maxAttempts}`, {
        delay: delay + jitter,
        error: error.message,
      });

      await sleep(delay + jitter);
    }
  }
  throw new Error('Max retries exceeded');
}
```

#### ❌ DON'T: Retry Non-Idempotent Operations Without Care

```typescript
// ❌ BAD - Could create duplicate charges
async function chargeCustomer(amount: number) {
  return await paymentApi.charge({ amount });
}
await fetchWithRetry(() => chargeCustomer(100));

// ✅ GOOD - Use idempotency key
async function chargeCustomer(amount: number, idempotencyKey: string) {
  return await paymentApi.charge({ amount, idempotencyKey });
}
await fetchWithRetry(() => chargeCustomer(100, uuid()));
```

### 3. Timeouts

#### ✅ DO: Set Realistic Timeouts

```yaml
# Fast operations (cache, auth)
timeout: 2s

# Standard API calls
timeout: 10s

# Database queries
timeout: 30s

# Long-running analytics
timeout: 300s

# Streaming/batch operations
timeout: 600s
```

#### ✅ DO: Cascade Timeouts

```
API Gateway Timeout (15s)
  └─► Service A Timeout (10s)
       └─► Service B Timeout (5s)
            └─► Database Timeout (3s)
```

---

## Observability

### 1. Distributed Tracing

#### ✅ DO: Add Custom Span Attributes

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const span = trace.getActiveSpan();
if (span) {
  // Business context
  span.setAttribute('tenant.id', tenantId);
  span.setAttribute('user.id', userId);
  span.setAttribute('entity.type', entityType);

  // Technical context
  span.setAttribute('db.query.complexity', queryComplexity);
  span.setAttribute('cache.hit', cacheHit);

  // Outcome
  span.setAttribute('result.count', results.length);
}
```

#### ✅ DO: Create Child Spans for Important Operations

```typescript
async function processEntity(entityId: string) {
  const tracer = trace.getTracer('graph-core');

  // Parent span (automatically created by framework)

  // Child span for database fetch
  const fetchSpan = tracer.startSpan('db.fetch_entity');
  fetchSpan.setAttribute('entity.id', entityId);
  try {
    const entity = await db.fetchEntity(entityId);
    fetchSpan.setStatus({ code: SpanStatusCode.OK });
    return entity;
  } catch (error) {
    fetchSpan.recordException(error);
    fetchSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    fetchSpan.end();
  }
}
```

### 2. Metrics

#### ✅ DO: Expose Custom Metrics

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Counter: Monotonically increasing value
const requestCounter = new Counter({
  name: 'summit_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'endpoint', 'status', 'tenant_id'],
});

// Histogram: Distribution of values
const queryDuration = new Histogram({
  name: 'summit_query_duration_seconds',
  help: 'Query execution duration',
  labelNames: ['query_type', 'complexity'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

// Gauge: Value that can go up and down
const activeConnections = new Gauge({
  name: 'summit_active_connections',
  help: 'Number of active database connections',
  labelNames: ['database'],
});

// Usage
requestCounter.inc({ method: 'POST', endpoint: '/entities', status: '200', tenant_id: 'acme' });
queryDuration.observe({ query_type: 'cypher', complexity: 'high' }, duration);
activeConnections.set({ database: 'neo4j' }, connectionCount);
```

### 3. Correlation IDs

#### ✅ DO: Generate and Propagate Correlation IDs

```typescript
import { v4 as uuid } from 'uuid';

// Middleware to add correlation ID
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuid();
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader('x-correlation-id', correlationId);

  // Add to logger context
  req.log = logger.child({ correlation_id: correlationId });

  next();
});

// Propagate to downstream services
async function callDownstreamService(req, endpoint) {
  return await fetch(endpoint, {
    headers: {
      'x-correlation-id': req.correlationId,
      'x-tenant-id': req.tenantId,
    },
  });
}
```

---

## Security

### 1. mTLS

#### ✅ DO: Trust the Mesh for mTLS

```typescript
// ❌ DON'T implement application-level TLS when using Istio
// The sidecar handles mTLS automatically!

// ✅ DO trust the sidecar-provided identity headers
app.use((req, res, next) => {
  // Istio adds identity headers
  const servicePrincipal = req.headers['x-forwarded-client-cert'];
  const sourceService = req.headers['x-envoy-peer-metadata'];

  // Use for additional authorization logic
  if (servicePrincipal) {
    req.sourcePrincipal = servicePrincipal;
  }

  next();
});
```

### 2. Authorization

#### ✅ DO: Implement Defense in Depth

```typescript
// Layer 1: Istio AuthorizationPolicy (network level)
// Layer 2: API Gateway authentication (JWT validation)
// Layer 3: Service-level authorization (business logic)

app.get('/api/v1/entities/:id', authenticate, authorize('entity:read'), async (req, res) => {
  const entity = await entityService.findById(req.params.id);

  // Layer 4: Data-level authorization (tenant isolation)
  if (entity.tenantId !== req.user.tenantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(entity);
});
```

### 3. Secrets

#### ❌ DON'T: Store Secrets in Code

```typescript
// ❌ BAD
const API_KEY = 'sk-1234567890abcdef';

// ✅ GOOD - Use environment variables
const API_KEY = process.env.API_KEY;

// ✅ BETTER - Use Kubernetes secrets
// Mounted as files in /etc/secrets/
const API_KEY = fs.readFileSync('/etc/secrets/api-key', 'utf8').trim();
```

---

## Performance

### 1. Connection Pooling

#### ✅ DO: Reuse Connections

```typescript
// ❌ BAD - Creates new connection per request
app.get('/entities', async (req, res) => {
  const db = await connectToDatabase();
  const entities = await db.query('SELECT * FROM entities');
  await db.close();
  res.json(entities);
});

// ✅ GOOD - Reuse connection pool
const pool = new Pool({
  host: 'postgres.summit.svc.cluster.local',
  database: 'summit',
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.get('/entities', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM entities');
    res.json(result.rows);
  } finally {
    client.release();
  }
});
```

### 2. Caching

#### ✅ DO: Cache Aggressively

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: 'redis://redis.summit.svc.cluster.local:6379',
});

async function getEntity(entityId: string) {
  // Try cache first
  const cached = await redis.get(`entity:${entityId}`);
  if (cached) {
    logger.debug('Cache hit', { entity_id: entityId });
    return JSON.parse(cached);
  }

  // Cache miss - fetch from database
  logger.debug('Cache miss', { entity_id: entityId });
  const entity = await db.fetchEntity(entityId);

  // Cache for 5 minutes
  await redis.setex(`entity:${entityId}`, 300, JSON.stringify(entity));

  return entity;
}
```

### 3. Batching

#### ✅ DO: Batch Database Queries

```typescript
// ❌ BAD - N+1 query problem
async function getEntitiesWithDetails(entityIds: string[]) {
  const results = [];
  for (const id of entityIds) {
    const entity = await db.query('SELECT * FROM entities WHERE id = $1', [id]);
    const details = await db.query('SELECT * FROM details WHERE entity_id = $1', [id]);
    results.push({ ...entity, details });
  }
  return results;
}

// ✅ GOOD - Batch queries
async function getEntitiesWithDetails(entityIds: string[]) {
  const entities = await db.query('SELECT * FROM entities WHERE id = ANY($1)', [entityIds]);

  const details = await db.query('SELECT * FROM details WHERE entity_id = ANY($1)', [entityIds]);

  // Join in application
  const detailsMap = new Map(details.map((d) => [d.entity_id, d]));
  return entities.map((e) => ({ ...e, details: detailsMap.get(e.id) }));
}
```

---

## Testing

### 1. Local Development

#### ✅ DO: Test Without the Mesh Locally

```typescript
// Use environment variable to detect mesh
const inMesh = process.env.ISTIO_ENABLED === 'true';

if (inMesh) {
  // Mesh handles mTLS, tracing, etc.
} else {
  // Local development - use HTTP, mock tracing
  app.use(
    cors({
      origin: 'http://localhost:3000',
    })
  );
}
```

### 2. Integration Tests

#### ✅ DO: Test Service-to-Service Communication

```typescript
import { test, expect } from '@jest/globals';

test('API Gateway → Graph Core integration', async () => {
  const response = await fetch('http://api-gateway.summit.svc.cluster.local/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'test-tenant',
    },
    body: JSON.stringify({
      query: '{ entity(id: "test-123") { id name } }',
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.data.entity.id).toBe('test-123');
});
```

### 3. Chaos Testing

#### ✅ DO: Test Resilience with Chaos Engineering

```yaml
# Inject latency to test timeouts
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
  namespace: summit
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - summit
    labelSelectors:
      app: graph-core
  delay:
    latency: 2s
    correlation: '100'
    jitter: 500ms
  duration: 5m

# Inject failures to test circuit breakers
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure
  namespace: summit
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - summit
    labelSelectors:
      app: graph-core
  duration: 30s
```

---

## Deployment

### 1. Rolling Updates

#### ✅ DO: Configure Rolling Update Strategy

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graph-core
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1 # At most 1 pod unavailable
      maxSurge: 2 # At most 2 extra pods during rollout
  minReadySeconds: 30 # Wait 30s after pod ready before continuing
```

### 2. Progressive Delivery

#### ✅ DO: Use Argo Rollouts for Advanced Deployments

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: graph-core
spec:
  replicas: 5
  strategy:
    canary:
      steps:
        - setWeight: 10 # 10% traffic to canary
        - pause: { duration: 5m }
        - setWeight: 25
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 75
        - pause: { duration: 5m }
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: graph-core
```

---

## Anti-Patterns

### ❌ DON'T: Bypass the Service Mesh

```typescript
// ❌ BAD - Direct pod IP access
const response = await fetch('http://10.0.1.45:8080/api');

// ✅ GOOD - Use Kubernetes service DNS
const response = await fetch('http://graph-core.summit.svc.cluster.local/api');
```

### ❌ DON'T: Ignore Health Check Failures

```yaml
# ❌ BAD
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 100 # Never restart!

# ✅ GOOD
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 3 # Restart after 3 failures
  periodSeconds: 10
```

### ❌ DON'T: Log Sensitive Data

```typescript
// ❌ BAD
logger.info('User logged in', {
  user_id: userId,
  password: password, // ❌ NEVER LOG PASSWORDS
  credit_card: creditCard, // ❌ NEVER LOG PII
});

// ✅ GOOD
logger.info('User logged in', {
  user_id: userId,
  ip_address: req.ip,
  user_agent: req.headers['user-agent'],
});
```

### ❌ DON'T: Implement Your Own Retry Logic When Istio Can Handle It

```typescript
// ❌ BAD - Redundant with Istio retries
async function fetchWithRetry(url: string) {
  for (let i = 0; i < 3; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === 2) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}

// ✅ GOOD - Let Istio handle retries via VirtualService
// Configure retries in retry-policies.yaml
async function fetchData(url: string) {
  return await fetch(url); // Istio retries automatically
}
```

---

## Related Documentation

- [Service Mesh Architecture](./service-mesh-architecture.md)
- [Service Mesh Operations Runbook](../../RUNBOOKS/service-mesh-operations.md)
- [OpenTelemetry Integration Guide](../observability/opentelemetry-guide.md)

---

**Questions or Feedback?** Contact the Platform Engineering team or open an issue.
