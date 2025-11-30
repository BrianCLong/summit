# Sandbox Tenant & Data Lab Architecture

## Overview

The Sandbox Tenant & Data Lab system provides a secure, isolated environment for research, experimentation, and development within the IntelGraph platform. It enables users to work with production-like data without risking data leakage, corruption, or unauthorized access to sensitive information.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IntelGraph Platform                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Production Tenant                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │  │ Neo4j   │  │Postgres │  │ Redis   │  │ Services│               │   │
│  │  │ Primary │  │ Primary │  │ Primary │  │         │               │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └─────────┘               │   │
│  └───────┼────────────┼────────────┼─────────────────────────────────────┘   │
│          │            │            │                                         │
│          │ BLOCKED    │ BLOCKED    │ BLOCKED                                │
│          ▼            ▼            ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Sandbox Gateway                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ GraphQL API  │  │ Enforcement  │  │   Metrics    │              │   │
│  │  │              │  │   Engine     │  │   /Tracing   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └──────────────────────────┬──────────────────────────────────────────┘   │
│                             │                                               │
│          ┌──────────────────┼──────────────────┐                           │
│          ▼                  ▼                  ▼                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │
│  │   Sandbox     │  │    Data Lab   │  │   Promotion   │                  │
│  │   Tenant      │  │    Service    │  │   Workflow    │                  │
│  │   Profile     │  │               │  │               │                  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                  │
│          │                  │                  │                           │
│          ▼                  ▼                  ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Sandbox Environment                              │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐           │   │
│  │  │ Neo4j   │  │Postgres │  │ Redis   │  │  Synthetic   │           │   │
│  │  │ Sandbox │  │ Sandbox │  │ Sandbox │  │    Data      │           │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └──────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Sandbox Gateway (`services/sandbox-gateway`)

The GraphQL API gateway providing unified access to all sandbox and data lab functionality.

**Features:**
- Full GraphQL schema with queries, mutations, and subscriptions
- Apollo Server 4 with federation support
- JWT-based authentication and RBAC
- Rate limiting and request validation
- Prometheus metrics and OpenTelemetry tracing
- Health check endpoints for Kubernetes probes

**Endpoints:**
- `POST /graphql` - GraphQL API
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

### 2. Sandbox Tenant Profile (`services/sandbox-tenant-profile`)

Manages sandbox configuration, lifecycle, and enforcement policies.

**Core Types:**
```typescript
interface SandboxTenantProfile {
  id: UUID;
  name: string;
  tenantType: 'PRODUCTION' | 'SANDBOX' | 'DATALAB' | 'STAGING';
  isolationLevel: 'STANDARD' | 'ENHANCED' | 'AIRGAPPED' | 'RESEARCH';
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';
  dataAccessPolicy: DataAccessPolicy;
  resourceQuotas: ResourceQuota;
  integrationRestrictions: IntegrationRestrictions;
  connectorRestrictions: ConnectorRestriction[];
  auditConfig: AuditConfig;
  uiIndicators: UIIndicatorConfig;
}
```

**Isolation Levels:**

| Level | Federation | External Export | Linkback | Use Case |
|-------|-----------|-----------------|----------|----------|
| STANDARD | Blocked | Restricted | Blocked | General sandbox |
| ENHANCED | Blocked | Blocked | Blocked | Sensitive data |
| AIRGAPPED | Blocked | Blocked | Blocked | Highest security |
| RESEARCH | Blocked | Logged | Blocked | R&D environments |

**Presets:**
- `dataLab` - Enhanced isolation for data experimentation
- `research` - Research-focused with audit logging
- `demo` - Standard isolation for demonstrations
- `training` - Standard isolation for training
- `airgapped` - Maximum isolation, no external connectivity

### 3. Data Lab Service (`services/datalab-service`)

Provides data cloning, synthetic generation, and anonymization capabilities.

**Clone Strategies:**

| Strategy | Description | Data Fidelity | PII Risk |
|----------|-------------|---------------|----------|
| STRUCTURE_ONLY | Schema only, no data | None | None |
| SYNTHETIC | Generated data | Low | None |
| ANONYMIZED | Real data with PII removed | High | Low |
| SAMPLED | Subset of real data | Medium | Medium |
| FUZZED | Real data with noise | High | Low |

**Anonymization Techniques:**
1. **REDACTION** - Complete removal
2. **HASHING** - One-way hash (SHA256)
3. **PSEUDONYMIZATION** - Consistent fake replacement
4. **GENERALIZATION** - Reduce precision (age → age range)
5. **MASKING** - Partial hiding (****1234)
6. **NOISE_ADDITION** - Statistical noise
7. **K_ANONYMITY** - Ensure k identical records
8. **DIFFERENTIAL_PRIVACY** - Mathematical privacy guarantee

**Synthetic Data Generators:**
- Person names, emails, phones, addresses
- Company names, industries, domains
- Financial data (accounts, transactions)
- Dates, timestamps, UUIDs
- Custom patterns and distributions

### 4. Promotion Workflow

Controlled process for moving artifacts from sandbox to production.

**Flow:**
```
DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED → PROMOTED
                              ↓
                          REJECTED
                              ↓
                       ROLLED_BACK
```

**Validation Checks:**
- Security scan for vulnerabilities
- Performance testing
- Compliance verification
- Data leakage detection

## Security Architecture

### Zero Trust Enforcement

All operations are subject to policy enforcement via the `SandboxEnforcer`:

```typescript
interface EnforcementRequest {
  sandboxId: string;
  userId: string;
  operation: OperationType;
  connectorType?: ConnectorType;
  targetEndpoint?: string;
  dataFields?: string[];
}

interface EnforcementDecision {
  allowed: boolean;
  reason: string;
  code?: string;
  requiresAudit: boolean;
  warnings: string[];
  filters?: DataFilter[];
}
```

### Linkback Prevention

**Absolute Rule:** Sandbox data can NEVER reference or link back to production data.

Detection mechanisms:
1. ID format validation (sandbox IDs have distinct prefix)
2. Relationship target validation
3. Query analysis for cross-tenant references
4. Runtime enforcement at database driver level

All linkback attempts are:
- Logged with full context
- Blocked immediately
- Reported to security dashboard
- Counted for anomaly detection

### Network Isolation

```yaml
# NetworkPolicy enforces:
# - No direct production database access
# - No external internet access (airgapped)
# - Limited internal service communication
# - Prometheus scraping allowed
# - OTEL tracing allowed
```

### Data Classification

All data in sandboxes is classified:
- `PUBLIC` - No restrictions
- `INTERNAL` - Internal use only
- `CONFIDENTIAL` - Requires anonymization
- `RESTRICTED` - Cannot be cloned

## Deployment Architecture

### Kubernetes Resources

```
k8s/sandbox-gateway/
├── deployment.yaml      # 3 replicas, rolling update
├── service.yaml         # ClusterIP service
├── ingress.yaml         # TLS termination, rate limiting
├── networkpolicy.yaml   # Zero trust network rules
├── configmap.yaml       # Runtime configuration
└── secrets.yaml         # Sensitive credentials
```

### Helm Chart

```
helm/sandbox-gateway/
├── Chart.yaml           # Chart metadata
├── values.yaml          # Default values
└── templates/
    ├── _helpers.tpl     # Template helpers
    ├── deployment.yaml  # Deployment template
    ├── service.yaml     # Service template
    ├── ingress.yaml     # Ingress template
    ├── configmap.yaml   # ConfigMap template
    ├── hpa.yaml         # Horizontal Pod Autoscaler
    ├── pdb.yaml         # Pod Disruption Budget
    └── serviceaccount.yaml
```

### Auto-scaling

```yaml
autoscaling:
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilization: 70%
  targetMemoryUtilization: 80%
  scaleUp: Aggressive (15s stabilization)
  scaleDown: Conservative (300s stabilization)
```

## Observability

### Metrics (Prometheus)

```
# Resolver metrics
sandbox_gateway_resolver_duration_seconds
sandbox_gateway_resolver_calls_total

# Sandbox lifecycle
sandbox_created_total{isolation_level}
sandbox_status_change_total{from, to}
sandbox_active_count{isolation_level}

# Data lab operations
datalab_clone_operations_total{strategy, status}
datalab_synthetic_data_generated_total
datalab_clone_duration_seconds{strategy}

# Security
sandbox_enforcement_decisions_total{operation, allowed}
sandbox_linkback_attempts_total{sandbox_id}

# Promotion
sandbox_promotion_requests_total{status}
sandbox_promotion_executed_total{status}
```

### Tracing (OpenTelemetry)

All operations generate distributed traces:
- `sandbox.create` - Sandbox creation
- `sandbox.enforcement.check` - Policy evaluation
- `sandbox.linkback.attempt` - Blocked attempts
- `datalab.clone` - Data cloning
- `datalab.synthetic.generate` - Synthetic data
- `sandbox.promotion.*` - Promotion workflow

### Logging (Pino)

Structured JSON logging with:
- Request ID correlation
- User/tenant context
- Operation details
- Performance timing
- Error stack traces (non-production)

## CLI Tool

```bash
# Sandbox management
sandbox sb list --status ACTIVE
sandbox sb create --name "Research Lab" --preset dataLab
sandbox sb get <id>
sandbox sb activate <id>
sandbox sb suspend <id> --reason "Maintenance"
sandbox sb check <id> FEDERATION --connector EXTERNAL_SERVICE

# Data lab operations
sandbox dl clone --sandbox <id> --strategy ANONYMIZED --source NEO4J
sandbox dl generate --sandbox <id> --count 1000 --seed 42

# Promotion workflow
sandbox promo list <sandbox-id>
sandbox promo create --sandbox <id> --type QUERY --justification "Performance improvement"
```

## Integration Points

### Production Services (Read-only)

- **Neo4j** - Graph data source for cloning
- **PostgreSQL** - Relational data source
- **Redis** - Cache data patterns

### External Services (Blocked in sandbox)

- Federation endpoints
- External APIs
- Webhook destinations
- File export destinations

### Internal Services (Allowed)

- Authentication service
- Audit logging service
- Metrics/tracing collectors
- Policy engine (OPA)

## Compliance

### Audit Trail

Every operation is logged:
```typescript
interface AuditEntry {
  timestamp: Date;
  userId: string;
  sandboxId: string;
  operation: string;
  result: 'success' | 'blocked' | 'error';
  details: Record<string, unknown>;
  requestId: string;
}
```

### Data Retention

- Sandbox data: Configurable (default 30 days)
- Audit logs: 90 days minimum
- Linkback attempts: 1 year
- Promotion history: Indefinite

### Compliance Frameworks

Supports tagging for:
- SOC 2
- ISO 27001
- GDPR
- HIPAA
- FedRAMP

## Performance Considerations

### Caching Strategy

- Sandbox profiles cached in Redis (5 minute TTL)
- Enforcement decisions cached per request
- Synthetic data templates cached indefinitely

### Resource Limits

Default quotas per sandbox:
- CPU: 1000ms per request
- Memory: 1GB peak
- Storage: 10GB
- Executions: 1000/hour
- Data export: 100MB/operation

### Scaling Guidelines

| Load | Replicas | Memory | Notes |
|------|----------|--------|-------|
| Low (<100 RPS) | 3 | 256Mi | Development |
| Medium (100-500 RPS) | 5 | 512Mi | Staging |
| High (500-2000 RPS) | 10 | 1Gi | Production |

## Disaster Recovery

### Backup Strategy

- Sandbox configurations: PostgreSQL backup
- Cloned data: S3/GCS with encryption
- Audit logs: Separate retention policy

### Recovery Procedures

1. Configuration recovery from PostgreSQL backup
2. Re-create sandboxes from stored profiles
3. Re-clone data (synthetic regenerated, anonymized re-processed)

### RTO/RPO

- Configuration RTO: 15 minutes
- Configuration RPO: 5 minutes (continuous replication)
- Data RTO: 1 hour
- Data RPO: 24 hours (daily snapshots)

## Future Roadmap

1. **Multi-region sandbox deployment**
2. **GPU-enabled sandboxes for ML workloads**
3. **Snapshot/restore capabilities**
4. **Collaborative sandbox sharing**
5. **Custom anonymization pipelines**
6. **Automated compliance reporting**
7. **Sandbox templates marketplace**
