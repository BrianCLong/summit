# Service Catalog Data Model

> **Version:** 1.0.0
> **Last Updated:** 2025-12-07
> **Status:** Active
> **Owner:** Platform Engineering

This document defines the canonical data model for the CompanyOS Service Catalog. All service metadata, ownership information, and capability mappings follow this schema.

---

## Table of Contents

1. [Core Entities](#core-entities)
2. [Entity Relationships](#entity-relationships)
3. [Required Metadata](#required-metadata)
4. [Integration Points](#integration-points)
5. [Schema Definitions](#schema-definitions)

---

## Core Entities

### 1. Service

The fundamental unit in the catalog. Represents a deployable, independently-releasable component.

```yaml
Service:
  id: string                    # Unique identifier (kebab-case, e.g., "graph-core")
  name: string                  # Human-readable name
  description: string           # What the service does (2-3 sentences)
  type: ServiceType             # api | worker | cron | data-pipeline | gateway | ui
  tier: ServiceTier             # critical | high | medium | low
  lifecycle: LifecycleState     # experimental | beta | ga | deprecated | sunset

  # Technical metadata
  language: string              # Primary language (typescript | python | go | rust)
  runtime: string               # Runtime version (node-20 | python-3.11 | go-1.21)
  repository: string            # Git repository path
  entry_point: string           # Main entry file path

  # Deployment
  deployment_status: DeploymentStatus  # production | staging | development | disabled
  namespace: string             # Kubernetes namespace
  helm_chart: string            # Helm chart path (optional)

  # Links
  documentation_url: string     # Primary docs URL
  runbook_url: string           # Runbook location
  dashboard_url: string         # Grafana/observability dashboard
  api_spec_url: string          # OpenAPI/GraphQL schema URL
```

### 2. Capability

A business capability that one or more services implement. Provides the "what" abstraction over services.

```yaml
Capability:
  id: string                    # Unique identifier (e.g., "authentication")
  name: string                  # Human-readable name (e.g., "Authentication & Identity")
  description: string           # Business description
  domain: CapabilityDomain      # security | data | intelligence | platform | operations

  # Mapping
  primary_service: ServiceRef   # The main service implementing this capability
  supporting_services: ServiceRef[]  # Additional services that contribute

  # Classification
  maturity: MaturityLevel       # emerging | established | strategic | commodity
  business_criticality: string  # How critical to business operations
```

### 3. Dependency

Represents a runtime dependency between services.

```yaml
Dependency:
  id: string                    # Auto-generated (source_id + target_id)
  source_service: ServiceRef    # The service that depends
  target_service: ServiceRef    # The service being depended upon
  dependency_type: DependencyType  # sync | async | data | configuration

  # Characteristics
  is_critical: boolean          # Is this a hard dependency?
  fallback_behavior: string     # What happens when target unavailable

  # Health
  slo_dependency: boolean       # Does target's SLO affect source's SLO?
  circuit_breaker: boolean      # Is circuit breaker implemented?
```

### 4. Interface

Represents an API or interface exposed by a service.

```yaml
Interface:
  id: string                    # Unique identifier
  service: ServiceRef           # Owning service
  type: InterfaceType           # graphql | rest | grpc | event | websocket

  # Specification
  version: string               # API version (v1, v2, etc.)
  spec_url: string              # OpenAPI/GraphQL/Proto URL
  base_path: string             # Base URL path

  # Access
  authentication: AuthType[]    # jwt | api-key | mtls | none
  authorization: string         # OPA policy path
  rate_limit: RateLimit         # Rate limiting configuration

  # Health
  health_endpoint: string       # Health check URL
  metrics_endpoint: string      # Prometheus metrics URL
```

### 5. OwnerGroup

Represents a team or individual responsible for services.

```yaml
OwnerGroup:
  id: string                    # Unique identifier (e.g., "platform-engineering")
  name: string                  # Team name
  type: OwnerType               # team | individual | squad | guild

  # Contact
  slack_channel: string         # Primary Slack channel
  email: string                 # Team email/distribution list
  pagerduty_schedule: string    # PagerDuty schedule ID

  # Members
  members: TeamMember[]         # Team members with roles

  # Hierarchy
  parent_group: OwnerGroupRef   # Parent org (optional)
  child_groups: OwnerGroupRef[] # Sub-teams (optional)
```

### 6. TeamMember

Individual team member with role.

```yaml
TeamMember:
  id: string                    # GitHub username or employee ID
  name: string                  # Full name
  email: string                 # Email address
  role: MemberRole              # lead | engineer | oncall | stakeholder
  primary: boolean              # Is this their primary team?
```

---

## Entity Relationships

### Service Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐    owns      ┌───────────┐    depends    ┌───────────┐
│  │OwnerGroup │─────────────▶│  Service  │─────────────▶│  Service  │
│  └───────────┘              └───────────┘              └───────────┘
│        │                          │                          │
│        │                          │ exposes                  │
│        │                          ▼                          │
│        │                    ┌───────────┐                    │
│        │                    │ Interface │                    │
│        │                    └───────────┘                    │
│        │                          │                          │
│        │                          │ implements               │
│        │                          ▼                          │
│        │  accountable for   ┌───────────┐                    │
│        └───────────────────▶│Capability │◀───────────────────┘
│                             └───────────┘   contributes to    │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship Cardinalities

| Relationship | From | To | Cardinality |
|-------------|------|-----|-------------|
| owns | OwnerGroup | Service | 1:N |
| depends_on | Service | Service | N:M |
| exposes | Service | Interface | 1:N |
| implements | Service | Capability | N:M |
| accountable_for | OwnerGroup | Capability | 1:N |
| member_of | TeamMember | OwnerGroup | N:M |

---

## Required Metadata

### SLO Metadata (Required for Tier: critical, high)

```yaml
SLOMetadata:
  availability:
    target: float               # e.g., 99.9 (percent)
    measurement_window: string  # 30d, 7d, etc.

  latency:
    p50_ms: integer            # P50 latency target
    p95_ms: integer            # P95 latency target
    p99_ms: integer            # P99 latency target

  error_rate:
    target: float              # e.g., 0.1 (percent)
    measurement_window: string

  freshness:                    # For data services
    max_staleness_seconds: integer
```

### Data Classification (Required for all services)

```yaml
DataClassification:
  data_classes: DataClass[]     # pii | phi | financial | confidential | public
  data_residency: string[]      # us | eu | apac | global
  retention_policy: string      # Policy identifier
  encryption_at_rest: boolean
  encryption_in_transit: boolean
```

### Tenancy Metadata

```yaml
TenancyMetadata:
  model: TenancyModel           # single | multi-tenant | hybrid
  tenant_isolation: IsolationType  # logical | physical | none
  tenants_served: string[]      # List of tenant IDs or "all"
```

### Runbook Metadata (Required for Tier: critical, high)

```yaml
RunbookMetadata:
  runbook_path: string          # Path to runbook
  playbooks:
    - name: string
      path: string
      trigger: string           # When to use

  escalation:
    - level: integer
      contact: string
      sla_minutes: integer
```

### Dashboard Metadata

```yaml
DashboardMetadata:
  grafana_uid: string           # Grafana dashboard UID
  prometheus_job: string        # Prometheus job name

  key_metrics:
    - name: string
      query: string             # PromQL query
      threshold: string         # Alert threshold
```

---

## Integration Points

### Intelligence Fabric (Graph Database)

Services and their relationships are stored in Neo4j for graph queries:

```cypher
// Service node
CREATE (s:Service {
  id: 'graph-core',
  name: 'Graph Core Service',
  tier: 'critical',
  lifecycle: 'ga'
})

// Capability node
CREATE (c:Capability {
  id: 'graph-storage',
  name: 'Graph Storage & Queries',
  domain: 'data'
})

// Relationships
CREATE (s)-[:IMPLEMENTS]->(c)
CREATE (s)-[:DEPENDS_ON {critical: true}]->(neo4j:Service {id: 'neo4j'})
```

### Org Graph (Team Ownership)

Integration with organizational hierarchy:

```cypher
// Owner group linked to org graph
CREATE (og:OwnerGroup {id: 'platform-engineering'})
CREATE (og)-[:BELONGS_TO]->(org:Organization {id: 'engineering'})
CREATE (og)-[:OWNS]->(s:Service {id: 'graph-core'})
```

### Policy Engine (OPA)

Service metadata informs authorization policies:

```rego
# OPA policy using service tier
allow {
  input.resource.service_tier == "critical"
  input.user.clearance >= "secret"
}
```

---

## Schema Definitions

### Enumerations

```yaml
ServiceType:
  - api              # REST/GraphQL API service
  - worker           # Background worker/consumer
  - cron             # Scheduled job
  - data-pipeline    # Data processing pipeline
  - gateway          # API gateway/proxy
  - ui               # Frontend application

ServiceTier:
  - critical         # Business-critical, highest SLOs
  - high             # Important, strict SLOs
  - medium           # Standard SLOs
  - low              # Best-effort

LifecycleState:
  - experimental     # Early development, no SLO guarantees
  - beta             # Pre-release, limited SLO
  - ga               # General availability, full SLOs
  - deprecated       # Scheduled for removal
  - sunset           # No longer supported

DeploymentStatus:
  - production       # Running in production
  - staging          # Running in staging only
  - development      # Local development only
  - disabled         # Temporarily disabled

DependencyType:
  - sync             # Synchronous HTTP/gRPC call
  - async            # Asynchronous message/event
  - data             # Database or storage dependency
  - configuration    # Configuration/secrets dependency

InterfaceType:
  - graphql          # GraphQL API
  - rest             # REST API
  - grpc             # gRPC service
  - event            # Event/message interface
  - websocket        # WebSocket connection

AuthType:
  - jwt              # JWT bearer token
  - api-key          # API key authentication
  - mtls             # Mutual TLS
  - oidc             # OpenID Connect
  - none             # No authentication (internal only)

OwnerType:
  - team             # Persistent team
  - individual       # Single owner
  - squad            # Cross-functional squad
  - guild            # Community of practice

MemberRole:
  - lead             # Technical lead
  - engineer         # Team member
  - oncall           # On-call rotation member
  - stakeholder      # Business stakeholder

CapabilityDomain:
  - security         # Security & compliance
  - data             # Data management & storage
  - intelligence     # Analytics & ML
  - platform         # Platform infrastructure
  - operations       # Operations & observability

MaturityLevel:
  - emerging         # New capability, actively developing
  - established      # Stable, well-defined
  - strategic        # Core differentiator
  - commodity        # Standard capability, consider buy vs build

TenancyModel:
  - single           # Single tenant
  - multi-tenant     # Multi-tenant with logical isolation
  - hybrid           # Mix of single and multi-tenant

IsolationType:
  - logical          # Logical separation (same infra)
  - physical         # Physical separation (dedicated infra)
  - none             # No tenant isolation

DataClass:
  - pii              # Personally Identifiable Information
  - phi              # Protected Health Information
  - financial        # Financial data
  - confidential     # Confidential business data
  - public           # Public data
```

### Reference Types

```yaml
ServiceRef:
  id: string                    # Service ID

OwnerGroupRef:
  id: string                    # Owner group ID

CapabilityRef:
  id: string                    # Capability ID

RateLimit:
  requests_per_second: integer
  burst_size: integer
  scope: string                 # per-tenant | per-user | global
```

---

## Validation Rules

### Service Validation

1. **ID Format**: Must be kebab-case, 3-50 characters
2. **Tier Requirements**:
   - `critical` tier requires: SLO metadata, runbook, dashboard, on-call rotation
   - `high` tier requires: SLO metadata, runbook, dashboard
3. **Lifecycle Transitions**: Can only move forward (experimental → beta → ga → deprecated → sunset)
4. **Owner Required**: Every service must have exactly one primary owner group

### Capability Validation

1. **Primary Service**: Must have exactly one primary implementing service
2. **Domain**: Must be one of the defined capability domains
3. **Owner**: Capability owner must own the primary service

### Dependency Validation

1. **No Self-Reference**: Service cannot depend on itself
2. **Circular Detection**: Warn on circular dependencies
3. **Critical Path**: If `is_critical=true`, target service tier must be >= source tier

---

## Example Service Entry

```yaml
# Example: graph-core service
service:
  id: graph-core
  name: Graph Core Service
  description: |
    Provides GraphQL API for Neo4j graph database operations including
    entity/relationship CRUD, graph traversals, and analytics queries.
  type: api
  tier: critical
  lifecycle: ga

  language: typescript
  runtime: node-20
  repository: services/graph-core
  entry_point: src/index.ts

  deployment_status: production
  namespace: summit-core
  helm_chart: helm/graph-core

  documentation_url: /docs/services/graph-core
  runbook_url: /runbooks/graph-core
  dashboard_url: https://grafana.example.com/d/graph-core
  api_spec_url: /graphql/schema

ownership:
  primary_owner: platform-engineering
  backup_owner: data-engineering
  oncall_schedule: graph-core-oncall

slo:
  availability:
    target: 99.9
    measurement_window: 30d
  latency:
    p50_ms: 50
    p95_ms: 200
    p99_ms: 500
  error_rate:
    target: 0.1
    measurement_window: 24h

data_classification:
  data_classes: [confidential]
  data_residency: [us, eu]
  retention_policy: standard-7y
  encryption_at_rest: true
  encryption_in_transit: true

tenancy:
  model: multi-tenant
  tenant_isolation: logical
  tenants_served: all

dependencies:
  - service: neo4j
    type: data
    is_critical: true
    fallback_behavior: Return cached data or 503
  - service: redis
    type: data
    is_critical: false
    fallback_behavior: Degrades gracefully (no cache)

interfaces:
  - id: graph-core-graphql
    type: graphql
    version: v1
    base_path: /graphql
    authentication: [jwt, mtls]
    authorization: policies/graph-core.rego
    health_endpoint: /health
    metrics_endpoint: /metrics

capabilities:
  - id: graph-storage
    role: primary
  - id: entity-management
    role: supporting
```

---

## Schema Evolution

### Versioning Strategy

- **Major versions**: Breaking changes to required fields
- **Minor versions**: New optional fields or enumerations
- **Patch versions**: Documentation or validation rule updates

### Migration Process

1. Announce schema changes 30 days in advance
2. Support both old and new schema during migration window
3. Provide automated migration scripts
4. Deprecate old schema version after migration complete

---

## Related Documents

- [SERVICE_CATALOG_V0.md](./SERVICE_CATALOG_V0.md) - Catalog overview and strategy
- [OWNERSHIP_PATTERNS.md](./OWNERSHIP_PATTERNS.md) - Ownership and accountability
- [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md) - Service readiness criteria
- [CAPABILITIES_MAP_UX.md](./CAPABILITIES_MAP_UX.md) - UX specifications
- [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) - Service registration template
