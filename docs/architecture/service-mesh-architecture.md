# Service Mesh Architecture for Summit/IntelGraph Platform

> **Document Status**: Production Ready
> **Last Updated**: 2025-11-20
> **Owner**: Platform Engineering Team
> **Related ADR**: [ADR-0006: Enforce mTLS via SPIFFE/SPIRE Service Mesh](../ADR/0006-mtls-mesh-layout.md)

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Service Mesh Components](#service-mesh-components)
4. [Communication Patterns](#communication-patterns)
5. [Resilience Patterns](#resilience-patterns)
6. [Observability](#observability)
7. [Security](#security)
8. [Performance Considerations](#performance-considerations)
9. [Operations](#operations)
10. [Migration Strategy](#migration-strategy)

---

## Executive Summary

The Summit/IntelGraph platform employs **Istio** as its service mesh solution to manage microservices communication across 60+ services. The service mesh provides:

- **Secure Communication**: mTLS encryption for all east-west traffic
- **Resilience**: Circuit breakers, retry policies, and timeout management
- **Observability**: Distributed tracing, metrics, and logging
- **Traffic Management**: Advanced routing, load balancing, and canary deployments
- **Policy Enforcement**: Authorization, rate limiting, and access control

### Key Metrics

- **Services**: 60+ microservices
- **Requests/sec**: ~50,000 (peak)
- **P95 Latency Target**: <1.5s (with <5ms mesh overhead)
- **Availability**: 99.9% SLA
- **Multi-Region**: US East, US West, EU West

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Istio Control Plane                       │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Istiod  │  │ Pilot   │  │ Citadel  │  │  Galley  │     │
│  │(Control)│  │(Config) │  │  (Certs) │  │ (Config) │     │
│  └─────────┘  └─────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Plane (Envoy Sidecars)             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Gateway │  │  Graph Core  │  │  NLP Service │      │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │      │
│  │  │Service │  │  │  │Service │  │  │  │Service │  │      │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │      │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │      │
│  │  │ Envoy  │◄─┼──┼─►│ Envoy  │◄─┼──┼─►│ Envoy  │  │      │
│  │  │Sidecar │  │  │  │Sidecar │  │  │  │Sidecar │  │      │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Observability Stack                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Prometheus│  │  Jaeger  │  │  Grafana │  │   ELK    │   │
│  │(Metrics) │  │ (Traces) │  │  (Dash)  │  │  (Logs)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Service Topology

```
Internet
    │
    ▼
┌─────────────────┐
│ Ingress Gateway │ (Istio Gateway)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  API Gateway    │ (GraphQL Federation)
└─────────────────┘
    │
    ├──► ┌──────────────┐
    │    │ Authz Gateway│ (Authorization)
    │    └──────────────┘
    │
    ├──► ┌──────────────┐      ┌──────────┐
    │    │  Graph Core  │─────►│  Neo4j   │
    │    └──────────────┘      └──────────┘
    │
    ├──► ┌──────────────┐      ┌──────────┐
    │    │ NLP Service  │─────►│PostgreSQL│
    │    └──────────────┘      └──────────┘
    │
    ├──► ┌──────────────┐
    │    │Analytics Eng.│
    │    └──────────────┘
    │
    └──► ┌──────────────┐      ┌──────────┐
         │Stream Process│─────►│  Kafka   │
         └──────────────┘      └──────────┘
```

---

## Service Mesh Components

### 1. Istio Control Plane

**Components:**

- **Istiod**: Unified control plane combining Pilot, Citadel, and Galley
- **Pilot**: Service discovery, traffic management, and intelligent routing
- **Citadel**: Certificate authority for mTLS (via SPIFFE/SPIRE)
- **Galley**: Configuration validation and distribution

**Deployment:**

- **High Availability**: 3 replicas across availability zones
- **Resource Allocation**: 2 CPU, 4GB RAM per replica
- **Auto-scaling**: HPA based on CPU (80% threshold)

### 2. Envoy Sidecar Proxies

**Features:**

- HTTP/1.1, HTTP/2, gRPC support
- TLS termination and origination
- Circuit breaking and health checks
- Load balancing (Round Robin, Least Request, Consistent Hash)
- Request/response manipulation
- Observability (metrics, logs, traces)

**Configuration:**

- **CPU Limits**: 100m request, 2000m limit
- **Memory**: 128Mi request, 1024Mi limit
- **Concurrency**: 2 worker threads
- **Buffer Limits**: 32KB

### 3. Ingress/Egress Gateways

**Ingress Gateway:**

- Public entry point for external traffic
- TLS termination
- Rate limiting
- Authentication integration

**Egress Gateway:**

- Controlled external service access
- Outbound traffic monitoring
- Compliance requirements (audit trail)

### 4. Observability Components

**OpenTelemetry Collector:**

- Trace aggregation from all sidecars
- Metrics collection and transformation
- Export to Jaeger and Prometheus

**Jaeger:**

- Distributed tracing UI
- Trace analysis and search
- Service dependency graph

**Prometheus:**

- Metrics collection (15s interval)
- Alerting rules
- Long-term storage integration

**Grafana:**

- Service mesh dashboards
- Performance monitoring
- SLO tracking

---

## Communication Patterns

### 1. Synchronous Request-Response

**Pattern**: HTTP/REST or gRPC

```typescript
// Client Service (API Gateway)
const response = await fetch('http://graph-core.summit.svc.cluster.local/api/v1/entities', {
  method: 'GET',
  headers: {
    'x-tenant-id': tenantId,
    'x-correlation-id': correlationId,
  },
});
```

**Mesh Capabilities:**

- Automatic mTLS encryption
- Load balancing across instances
- Circuit breaking on failures
- Request retry with exponential backoff
- Distributed tracing propagation

### 2. Asynchronous Messaging

**Pattern**: Kafka event streaming

```typescript
// Producer Service
await producer.send({
  topic: 'entity-events',
  messages: [
    {
      key: entityId,
      value: JSON.stringify(event),
      headers: {
        'x-tenant-id': tenantId,
        'x-correlation-id': correlationId,
      },
    },
  ],
});

// Consumer Service
consumer.on('message', async (message) => {
  const event = JSON.parse(message.value);
  // Process event
});
```

**Mesh Integration:**

- Kafka cluster accessed via service mesh
- mTLS for Kafka connections
- Observability for produce/consume operations

### 3. GraphQL Federation

**Pattern**: Distributed GraphQL schema

```typescript
// API Gateway (Supergraph)
const gateway = new ApolloGateway({
  supergraphSdl: federatedSchema,
  serviceList: [
    { name: 'entities', url: 'http://graph-core.summit.svc.cluster.local/graphql' },
    { name: 'users', url: 'http://user-service.summit.svc.cluster.local/graphql' },
    { name: 'analytics', url: 'http://analytics-engine.summit.svc.cluster.local/graphql' },
  ],
});
```

**Mesh Benefits:**

- Automatic service discovery
- Load balancing to subgraph instances
- Retry on transient failures
- Request tracing across subgraphs

### 4. Database Access Patterns

**PostgreSQL:**

- Connection pooling via PgBouncer
- Read/write splitting via VirtualService
- Mesh-managed connection limits

**Neo4j:**

- Bolt protocol support
- Primary/read-replica routing
- Query timeout enforcement

**Redis:**

- Master/replica topology
- Read-heavy workload distribution
- Fast failover on master failure

---

## Resilience Patterns

### 1. Circuit Breakers

**Purpose**: Prevent cascading failures by stopping requests to failing services.

**Configuration Example** (`circuit-breakers.yaml`):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: graph-core-circuit-breaker
  namespace: summit
spec:
  host: graph-core.summit.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 3
        maxRetries: 2
    outlierDetection:
      consecutive5xxErrors: 3
      consecutiveGatewayErrors: 2
      interval: 30s
      baseEjectionTime: 90s
      maxEjectionPercent: 40
      minHealthPercent: 60
```

**Behavior:**

- **Closed State**: Normal operation, requests flow
- **Open State**: After 3 consecutive 5xx errors, circuit opens (no requests)
- **Half-Open State**: After 90s, allow test requests
- **Recovery**: If test requests succeed, close circuit

### 2. Retry Policies

**Purpose**: Handle transient failures automatically.

**Configuration Example** (`retry-policies.yaml`):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: graph-core-retry
  namespace: summit
spec:
  hosts:
    - graph-core.summit.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /api/v1/entities
          method:
            exact: GET
      retries:
        attempts: 4
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure,refused-stream
      timeout: 20s
```

**Retry Conditions:**

- `5xx`: Server errors
- `reset`: Connection reset
- `connect-failure`: Cannot connect
- `refused-stream`: Stream refused (gRPC)
- `retriable-4xx`: Specific 4xx errors (429, 409)

### 3. Timeouts

**Purpose**: Prevent indefinite waits and resource exhaustion.

**Timeout Hierarchy:**

1. **Connection Timeout**: 3-10s (depends on service)
2. **Per-Try Timeout**: 2-30s (per retry attempt)
3. **Total Request Timeout**: 10-300s (end-to-end)

**Example:**

```yaml
http:
  - route:
      - destination:
          host: analytics-engine.summit.svc.cluster.local
    timeout: 300s # 5 minutes for analytics
    retries:
      attempts: 2
      perTryTimeout: 60s # 1 minute per attempt
```

### 4. Rate Limiting

**Purpose**: Protect services from overload.

**Implementation:**

- **Global Rate Limiting**: Envoy rate limit service
- **Per-Tenant Limiting**: Via `x-tenant-id` header
- **Cost-Based Limiting**: Summit's cost guard middleware

### 5. Bulkheading

**Purpose**: Isolate failures to prevent total system outage.

**Strategies:**

- **Connection Pools**: Limit concurrent connections per service
- **Thread Pools**: Separate thread pools for critical vs. non-critical operations
- **Resource Limits**: CPU/memory limits on pods

---

## Observability

### 1. Distributed Tracing

**Implementation**: OpenTelemetry + Jaeger

**Trace Propagation**:

```typescript
// Automatic trace context propagation via HTTP headers
// No application code changes required!

// Manual instrumentation (optional)
import { trace } from '@opentelemetry/api';

const span = trace.getTracer('graph-core').startSpan('fetch-entity');
span.setAttribute('entity.id', entityId);
span.setAttribute('tenant.id', tenantId);

try {
  const entity = await fetchEntity(entityId);
  span.setStatus({ code: SpanStatusCode.OK });
  return entity;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
} finally {
  span.end();
}
```

**Sampling Strategy:**

- **Default**: 10% sampling
- **Errors**: 100% sampling (all error traces kept)
- **Slow Requests**: 100% sampling (>2s latency)
- **High-Value Operations**: 100% sampling (critical paths)

**Trace Attributes:**

- `tenant.id`: Multi-tenancy tracking
- `user.id`: User attribution
- `correlation.id`: Request correlation
- `service.version`: Canary analysis
- `http.method`, `http.status_code`: Standard attributes

### 2. Metrics

**Istio Metrics** (Prometheus):

- **Request Rate**: `istio_requests_total`
- **Request Duration**: `istio_request_duration_milliseconds`
- **Request Size**: `istio_request_bytes`, `istio_response_bytes`
- **TCP Metrics**: `istio_tcp_sent_bytes_total`, `istio_tcp_received_bytes_total`

**Custom Application Metrics**:

```typescript
import { Counter, Histogram } from 'prom-client';

const requestCounter = new Counter({
  name: 'summit_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'endpoint', 'status'],
});

const requestDuration = new Histogram({
  name: 'summit_api_request_duration_seconds',
  help: 'API request duration',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});
```

**Dashboards**: See `observability/grafana/dashboards/service-mesh.json`

### 3. Logging

**Log Aggregation**: FluentBit → Elasticsearch → Kibana

**Log Format** (Structured JSON):

```json
{
  "timestamp": "2025-11-20T10:30:00.000Z",
  "level": "info",
  "service": "graph-core",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "tenant_id": "acme-corp",
  "user_id": "user-123",
  "message": "Entity fetched successfully",
  "entity_id": "ent-456",
  "duration_ms": 45
}
```

**Log Levels**:

- `error`: Errors requiring attention
- `warn`: Warnings and anomalies
- `info`: Important business events
- `debug`: Detailed debugging (dev only)

### 4. Health Checks

**Kubernetes Probes**:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Mesh Health Checks**:

- Envoy performs active health checks
- Outlier detection ejects unhealthy instances

---

## Security

### 1. Mutual TLS (mTLS)

**Implementation**: SPIFFE/SPIRE for workload identity

**Certificate Lifecycle**:

1. **Issuance**: SPIRE agent issues SVID to workload
2. **Rotation**: Automatic rotation every 24 hours
3. **Revocation**: Immediate revocation on pod termination

**Configuration**:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: summit
spec:
  mtls:
    mode: STRICT # Enforce mTLS for all traffic
```

### 2. Authorization Policies

**OPA Integration**: Open Policy Agent for fine-grained authorization

**Example Policy**:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: graph-core-authz
  namespace: summit
spec:
  selector:
    matchLabels:
      app: graph-core
  rules:
    - from:
        - source:
            principals: ['cluster.local/ns/summit/sa/api-gateway']
      to:
        - operation:
            methods: ['GET', 'POST']
            paths: ['/api/v1/*']
      when:
        - key: request.headers[x-tenant-id]
          notValues: ['']
```

### 3. Network Policies

**Defense in Depth**: Kubernetes NetworkPolicies + Istio AuthorizationPolicies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: graph-core-netpol
  namespace: summit
spec:
  podSelector:
    matchLabels:
      app: graph-core
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: neo4j
      ports:
        - protocol: TCP
          port: 7687
```

### 4. Secret Management

- **Kubernetes Secrets**: TLS certificates, database credentials
- **External Secrets Operator**: Integration with AWS Secrets Manager, HashiCorp Vault
- **Secret Rotation**: Automatic rotation via CronJob

---

## Performance Considerations

### 1. Latency Overhead

**Istio Latency Impact**: <5ms (P95)

**Breakdown**:

- Sidecar proxy processing: 1-3ms
- mTLS handshake (cached): <1ms
- Policy evaluation: <1ms

**Optimization**:

- Use HTTP/2 for reduced connection overhead
- Enable connection pooling
- Tune Envoy buffer sizes

### 2. Resource Utilization

**Sidecar Resource Usage**:

- **CPU**: 10-100m (idle-loaded)
- **Memory**: 50-200MB (depending on traffic)

**Control Plane Resources**:

- **Istiod**: 500m CPU, 2GB RAM (per replica)
- **Telemetry**: 200m CPU, 512MB RAM

### 3. Scaling

**Horizontal Pod Autoscaler (HPA)**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: graph-core-hpa
  namespace: summit
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: graph-core
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: '1000'
```

**Cluster Autoscaler**: Automatically adds nodes when pods are pending

---

## Operations

### 1. Deployment

See [Service Mesh Deployment Runbook](../../RUNBOOKS/service-mesh-deployment.md)

**Deployment Steps**:

1. Install Istio control plane
2. Label namespaces for injection
3. Deploy services with sidecars
4. Apply traffic policies
5. Verify connectivity and observability

### 2. Monitoring

**Key Metrics to Watch**:

- **Success Rate**: >99.9%
- **P95 Latency**: <1.5s
- **Error Rate**: <0.1%
- **Circuit Breaker Trips**: Track anomalies
- **Connection Pool Saturation**: Prevent exhaustion

**Alerts**:

- High error rate (>1%)
- High latency (P95 >2s)
- Control plane unavailability
- Certificate expiration (<7 days)

### 3. Troubleshooting

**Common Issues**:

1. **mTLS Handshake Failures**: Check certificates and trust domain
2. **503 Service Unavailable**: Circuit breaker tripped or no healthy instances
3. **High Latency**: Check for retries, circuit breakers, or overloaded services
4. **Connection Refused**: Service not started or network policy blocking

**Debugging Tools**:

```bash
# Check Envoy config
istioctl proxy-config cluster <pod> -n summit

# View access logs
kubectl logs <pod> -n summit -c istio-proxy

# Enable debug logging
istioctl proxy-config log <pod> -n summit --level debug

# Analyze traffic
istioctl analyze -n summit
```

---

## Migration Strategy

### Phase 1: Control Plane Installation (Week 1)

- Install Istio in `istio-system` namespace
- Deploy observability stack
- Configure mTLS with SPIFFE/SPIRE

### Phase 2: Progressive Service Onboarding (Weeks 2-6)

**Order of Migration**:

1. **Non-critical services**: Test mesh functionality
2. **Read-only services**: No data mutation risk
3. **Critical read-write services**: Staged rollout
4. **Databases**: Last (careful connection management)

**Per-Service Checklist**:

- [ ] Label namespace for sidecar injection
- [ ] Deploy service with sidecar
- [ ] Configure DestinationRule (circuit breakers, load balancing)
- [ ] Configure VirtualService (routing, retries, timeouts)
- [ ] Verify observability (traces, metrics, logs)
- [ ] Load test and validate performance
- [ ] Promote to production traffic

### Phase 3: Advanced Features (Weeks 7-8)

- Canary deployments
- A/B testing
- Traffic mirroring
- Advanced authorization policies

### Phase 4: Optimization (Ongoing)

- Tune resource limits
- Optimize retry policies
- Refine circuit breaker settings
- Enhance observability

---

## Related Documentation

- [Service Mesh Best Practices](./service-mesh-best-practices.md)
- [Service Mesh Operations Runbook](../../RUNBOOKS/service-mesh-operations.md)
- [ADR-0006: mTLS via SPIFFE/SPIRE](../ADR/0006-mtls-mesh-layout.md)
- [Multi-Cluster Setup](../../infrastructure/kubernetes/multi-cluster/README.md)

---

## Appendix

### A. Service Inventory

See [Service Catalog](./service-catalog.md) for complete list of services.

### B. Configuration Files

- Circuit Breakers: `infra/service-mesh/circuit-breakers.yaml`
- Retry Policies: `infra/service-mesh/retry-policies.yaml`
- Distributed Tracing: `infra/service-mesh/distributed-tracing.yaml`
- Load Balancing: `infra/service-mesh/load-balancing.yaml`

### C. Glossary

- **Service Mesh**: Infrastructure layer for managing service-to-service communication
- **Sidecar**: Proxy deployed alongside each service instance
- **mTLS**: Mutual TLS authentication between services
- **Circuit Breaker**: Pattern to prevent cascading failures
- **Envoy**: High-performance proxy used by Istio
- **Istiod**: Istio control plane component

---

**Questions or Issues?** Contact the Platform Engineering team or open an issue in the [Summit GitHub repository](https://github.com/BrianCLong/summit/issues).
