# Service & Capability Catalog v0

> **Version:** 0.1.0
> **Last Updated:** 2025-12-07
> **Status:** Draft
> **Owner:** Platform Engineering

The living map of all services, capabilities, and owners in CompanyOS. Nobody ever asks "who owns this?" or "what does this service actually do?"—it's always in the catalog.

---

## Table of Contents

1. [Vision & Goals](#vision--goals)
2. [Catalog Structure](#catalog-structure)
3. [Capability Domains](#capability-domains)
4. [Service Registry](#service-registry)
5. [Implementation Roadmap](#implementation-roadmap)
6. [API & Integrations](#api--integrations)

---

## Vision & Goals

### Mission Statement

> Build the living map of all services, capabilities, and owners in CompanyOS: who owns what, what it does, how it behaves, and how it's related.

### Goals

| Goal | Success Metric | Target |
|------|---------------|--------|
| **Discoverability** | Time to find service owner | < 30 seconds |
| **Completeness** | Services in catalog | 100% of production services |
| **Accuracy** | Stale entries | < 5% |
| **Usability** | User satisfaction | > 4.5/5 rating |
| **Automation** | Auto-populated fields | > 70% |

### Key Questions This Solves

- **"Who owns this service?"** → Owner tab, always current
- **"What does this service do?"** → Description + capabilities
- **"What depends on this?"** → Dependency graph
- **"What's the blast radius?"** → Impact visualization
- **"Is this service healthy?"** → SLO status overlay
- **"How do I contact the team?"** → One-click to Slack/PagerDuty
- **"Where are the runbooks?"** → Linked documentation

---

## Catalog Structure

### Three-Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        CATALOG LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: CAPABILITIES (Business View)                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Authentication  │  Graph Storage  │  Data Ingestion    │    │
│  │  Authorization   │  Entity Mgmt    │  Analytics         │    │
│  │  Audit & Comply  │  Search         │  AI/ML Services    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  LAYER 2: SERVICES (Technical View)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  authz-gateway   │  graph-core     │  feed-processor    │    │
│  │  prov-ledger     │  api-gateway    │  analytics-engine  │    │
│  │  conductor       │  search-api     │  copilot-service   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           │                                      │
│                           ▼                                      │
│  LAYER 3: INFRASTRUCTURE (Deployment View)                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Kubernetes      │  Databases      │  Message Queues    │    │
│  │  Load Balancers  │  Caches         │  Object Storage    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Model

```yaml
catalog_navigation:
  primary_views:
    - capabilities_map    # Business-oriented capability view
    - service_list        # Alphabetical service directory
    - dependency_graph    # Visual dependency explorer
    - owner_directory     # Team/owner lookup

  filters:
    - tier: [critical, high, medium, low]
    - lifecycle: [experimental, beta, ga, deprecated]
    - domain: [security, data, intelligence, platform, operations]
    - owner: [team selector]
    - status: [healthy, degraded, down]

  search:
    - full_text: "Search services, capabilities, descriptions"
    - faceted: "Filter by attributes"
    - semantic: "Natural language queries (future)"
```

---

## Capability Domains

### Domain Taxonomy

```yaml
capability_domains:

  security:
    name: Security & Compliance
    description: Authentication, authorization, audit, and compliance capabilities
    capabilities:
      - id: authentication
        name: Authentication & Identity
        primary_service: authz-gateway
        description: User authentication via OIDC, MFA, and WebAuthn

      - id: authorization
        name: Authorization & Access Control
        primary_service: authz-gateway
        description: RBAC, ABAC, and policy-based access control via OPA

      - id: audit-compliance
        name: Audit & Compliance
        primary_service: prov-ledger
        description: Audit logging, provenance tracking, compliance reporting

      - id: secrets-management
        name: Secrets Management
        primary_service: vault-proxy
        description: Secure storage and retrieval of secrets and credentials

      - id: data-protection
        name: Data Protection
        primary_service: privacy-service
        description: PII handling, encryption, data residency controls

  data:
    name: Data Management
    description: Storage, processing, and management of data
    capabilities:
      - id: graph-storage
        name: Graph Storage & Queries
        primary_service: graph-core
        description: Neo4j-based entity and relationship storage

      - id: entity-management
        name: Entity Management
        primary_service: graph-core
        description: CRUD operations for canonical entities

      - id: entity-resolution
        name: Entity Resolution
        primary_service: er-service
        description: Deduplication and entity matching

      - id: data-ingestion
        name: Data Ingestion
        primary_service: ingest-service
        description: Batch and streaming data ingestion

      - id: data-quality
        name: Data Quality
        primary_service: data-quality
        description: Data validation, lineage tracking, anomaly detection

      - id: search
        name: Search & Discovery
        primary_service: search-api
        description: Full-text and graph search capabilities

  intelligence:
    name: Intelligence & Analytics
    description: Analysis, ML, and insight generation
    capabilities:
      - id: graph-analytics
        name: Graph Analytics
        primary_service: graph-api
        description: Path algorithms, centrality, community detection

      - id: ml-inference
        name: ML Inference
        primary_service: ml-service
        description: Real-time model inference

      - id: copilot
        name: AI Copilot
        primary_service: copilot-service
        description: AI-assisted analysis and recommendations

      - id: analytics
        name: Analytics & Reporting
        primary_service: analytics-engine
        description: Dashboards, reports, and data visualization

      - id: threat-detection
        name: Threat Detection
        primary_service: threat-service
        description: Anomaly detection and threat identification

  platform:
    name: Platform Infrastructure
    description: Core platform services and infrastructure
    capabilities:
      - id: api-gateway
        name: API Gateway
        primary_service: api-gateway
        description: Request routing, rate limiting, API management

      - id: orchestration
        name: Workflow Orchestration
        primary_service: conductor
        description: Workflow execution and coordination

      - id: event-streaming
        name: Event Streaming
        primary_service: kafka-proxy
        description: Event publishing and consumption

      - id: caching
        name: Caching
        primary_service: redis-proxy
        description: Distributed caching layer

      - id: configuration
        name: Configuration Management
        primary_service: config-service
        description: Feature flags and runtime configuration

  operations:
    name: Operations & Observability
    description: Monitoring, alerting, and operational tooling
    capabilities:
      - id: observability
        name: Observability
        primary_service: otel-collector
        description: Metrics, traces, and logs collection

      - id: alerting
        name: Alerting
        primary_service: alertmanager
        description: Alert routing and notification

      - id: incident-management
        name: Incident Management
        primary_service: incident-service
        description: Incident tracking and response coordination

      - id: release-management
        name: Release Management
        primary_service: release-service
        description: Deployment coordination and canary management
```

### Capability-Service Matrix

| Capability | Primary Service | Supporting Services |
|------------|----------------|---------------------|
| Authentication | authz-gateway | identity-service |
| Authorization | authz-gateway | policy-service, opa |
| Audit & Compliance | prov-ledger | audit-log, auditlake |
| Graph Storage | graph-core | neo4j |
| Entity Management | graph-core | er-service |
| Search | search-api | elasticsearch |
| AI Copilot | copilot-service | ml-service, rag-service |
| API Gateway | api-gateway | rate-limiter |
| Orchestration | conductor | maestro-core |
| Observability | otel-collector | prometheus, jaeger |

---

## Service Registry

### Tier 1: Critical Services (14 services)

Services essential to platform operation. Require 99.9%+ availability.

| Service | Capability | Owner | Status |
|---------|-----------|-------|--------|
| authz-gateway | Authorization | security-engineering | GA |
| graph-core | Graph Storage | platform-engineering | GA |
| api-gateway | API Gateway | platform-engineering | GA |
| prov-ledger | Audit | data-engineering | GA |
| conductor | Orchestration | orchestration-team | GA |
| neo4j | Data Store | data-engineering | GA |
| redis | Caching | platform-engineering | GA |
| postgres | Data Store | data-engineering | GA |
| kafka | Streaming | data-engineering | GA |
| otel-collector | Observability | sre-team | GA |
| prometheus | Metrics | sre-team | GA |
| identity-service | Authentication | security-engineering | GA |
| config-service | Configuration | platform-engineering | GA |
| secrets-service | Secrets | security-engineering | GA |

### Tier 2: High Services (32 services)

Important services with strict SLOs. Require 99.5%+ availability.

| Service | Capability | Owner | Status |
|---------|-----------|-------|--------|
| copilot-service | AI Copilot | ai-team | GA |
| search-api | Search | search-team | GA |
| analytics-engine | Analytics | analytics-team | GA |
| er-service | Entity Resolution | data-engineering | GA |
| ml-service | ML Inference | ai-team | GA |
| feed-processor | Ingestion | data-engineering | GA |
| ingest-service | Ingestion | data-engineering | GA |
| graph-api | Graph Analytics | platform-engineering | GA |
| data-quality | Data Quality | data-engineering | GA |
| compliance-service | Compliance | security-engineering | GA |
| privacy-service | Data Protection | security-engineering | GA |
| export-service | Export | data-engineering | GA |
| notification-service | Notifications | platform-engineering | GA |
| scheduler | Scheduling | platform-engineering | GA |
| workflow-service | Workflows | orchestration-team | GA |
| ... | ... | ... | ... |

### Tier 3: Medium Services (108 services)

Standard services with baseline SLOs.

### Tier 4: Low Services (171 services)

Best-effort services, experimental, or internal tools.

### Service Count by Domain

```
Security & Compliance:     28 services
Data Management:           67 services
Intelligence & Analytics:  45 services
Platform Infrastructure:   52 services
Operations & Observability: 23 services
Other/Uncategorized:       110 services
────────────────────────────────────────
Total:                     325 services
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

```yaml
phase_1:
  name: Catalog Foundation
  duration: 4 weeks
  goals:
    - Deploy catalog backend service
    - Import all services from SERVICE_INVENTORY.md
    - Establish ownership for critical/high tier services
    - Create basic UI for service lookup

  deliverables:
    - [ ] Service catalog GraphQL API
    - [ ] Initial data import script
    - [ ] Basic web UI (service list + detail view)
    - [ ] CODEOWNERS sync automation
    - [ ] Critical/high tier services fully documented

  success_criteria:
    - All 46 critical+high services in catalog
    - 100% ownership assignment for those services
    - Time to find owner < 60 seconds
```

### Phase 2: Dependencies & Capabilities (Weeks 5-8)

```yaml
phase_2:
  name: Dependency Mapping
  duration: 4 weeks
  goals:
    - Map service dependencies
    - Define capability taxonomy
    - Link services to capabilities
    - Build dependency visualization

  deliverables:
    - [ ] Dependency import from code analysis
    - [ ] Capability catalog with service mappings
    - [ ] Interactive dependency graph visualization
    - [ ] Blast radius calculator
    - [ ] Capabilities map view

  success_criteria:
    - >80% dependencies mapped
    - All capabilities assigned primary services
    - Blast radius visible for critical services
```

### Phase 3: Health & Observability (Weeks 9-12)

```yaml
phase_3:
  name: Health Integration
  duration: 4 weeks
  goals:
    - Integrate SLO data
    - Add real-time health status
    - Build owner dashboards
    - Create alerting on ownership gaps

  deliverables:
    - [ ] SLO status overlay on catalog
    - [ ] Owner team dashboard
    - [ ] Error budget tracking
    - [ ] Stale ownership detection
    - [ ] PagerDuty integration

  success_criteria:
    - Real-time SLO status for critical services
    - Automated stale ownership alerts
    - Owner dashboard shows team's services
```

### Phase 4: Automation & Governance (Weeks 13-16)

```yaml
phase_4:
  name: Governance Automation
  duration: 4 weeks
  goals:
    - Automate ownership verification
    - Implement ownership transfer workflow
    - Create compliance reports
    - Full service lifecycle management

  deliverables:
    - [ ] Quarterly audit automation
    - [ ] Ownership transfer workflow
    - [ ] Compliance dashboard
    - [ ] Service creation workflow
    - [ ] Deprecation tracking

  success_criteria:
    - Zero orphaned services
    - Ownership transfer < 2 weeks
    - 100% catalog compliance
```

---

## API & Integrations

### GraphQL API

```graphql
type Query {
  # Service queries
  service(id: ID!): Service
  services(filter: ServiceFilter): [Service!]!
  searchServices(query: String!): [Service!]!

  # Capability queries
  capability(id: ID!): Capability
  capabilities(domain: CapabilityDomain): [Capability!]!

  # Ownership queries
  owner(id: ID!): OwnerGroup
  owners: [OwnerGroup!]!
  servicesOwnedBy(ownerId: ID!): [Service!]!

  # Dependency queries
  dependencies(serviceId: ID!): DependencyGraph!
  dependents(serviceId: ID!): [Service!]!
  blastRadius(serviceId: ID!): BlastRadiusReport!
}

type Mutation {
  # Service mutations
  createService(input: CreateServiceInput!): Service!
  updateService(id: ID!, input: UpdateServiceInput!): Service!
  deprecateService(id: ID!, reason: String!): Service!

  # Ownership mutations
  transferOwnership(input: TransferOwnershipInput!): TransferRequest!
  reportOrphanedService(serviceId: ID!): OrphanReport!

  # Dependency mutations
  addDependency(input: AddDependencyInput!): Dependency!
  removeDependency(id: ID!): Boolean!
}

type Subscription {
  # Real-time updates
  serviceHealthChanged(serviceId: ID): ServiceHealthEvent!
  ownershipChanged(ownerId: ID): OwnershipEvent!
}
```

### Integration Points

```yaml
integrations:

  github:
    purpose: CODEOWNERS sync, PR ownership validation
    sync: bidirectional
    frequency: on push, hourly

  pagerduty:
    purpose: On-call schedule, incident ownership
    sync: read
    frequency: real-time

  grafana:
    purpose: SLO dashboards, health status
    sync: read
    frequency: real-time

  prometheus:
    purpose: Service metrics, SLO calculation
    sync: read
    frequency: real-time

  neo4j:
    purpose: Store service/capability graph
    sync: bidirectional
    frequency: real-time

  slack:
    purpose: Notifications, owner lookup bot
    sync: bidirectional
    frequency: real-time

  jira:
    purpose: Ownership transfer tickets
    sync: bidirectional
    frequency: on event

  argocd:
    purpose: Deployment status
    sync: read
    frequency: real-time
```

### CLI Interface

```bash
# Service lookup
summit catalog get <service-id>
summit catalog list --tier=critical --owner=platform-engineering
summit catalog search "authentication"

# Ownership
summit catalog owner <service-id>
summit catalog transfer <service-id> --to=<new-owner>
summit catalog audit --format=json

# Dependencies
summit catalog deps <service-id>
summit catalog dependents <service-id>
summit catalog blast-radius <service-id>

# Capabilities
summit catalog capabilities --domain=security
summit catalog capability <capability-id>

# Health
summit catalog health <service-id>
summit catalog slo <service-id>
```

### Slack Bot Commands

```
/summit owner graph-core
  → Owner: platform-engineering
    Slack: #platform-engineering
    On-Call: @jane-doe (ends in 4 hours)

/summit service authz-gateway
  → authz-gateway (Authorization Gateway)
    Tier: critical | Status: healthy
    Owner: security-engineering
    SLO: 99.95% (target: 99.9%)

/summit deps api-gateway
  → api-gateway depends on:
    • authz-gateway (critical)
    • graph-core (critical)
    • redis (critical)

/summit health critical
  → Critical Services Health:
    ✅ authz-gateway: 99.98%
    ✅ graph-core: 99.95%
    ⚠️ api-gateway: 99.85% (below target)
```

---

## Related Documents

- [SERVICE_CATALOG_DATA_MODEL.md](./SERVICE_CATALOG_DATA_MODEL.md) - Data model schema
- [OWNERSHIP_PATTERNS.md](./OWNERSHIP_PATTERNS.md) - Ownership rules
- [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md) - Readiness criteria
- [CAPABILITIES_MAP_UX.md](./CAPABILITIES_MAP_UX.md) - UX specifications
- [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) - Registration template
- [SERVICE_INVENTORY.md](/SERVICE_INVENTORY.md) - Current service inventory
