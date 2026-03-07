# Integration Surface Mapping

**Objective**: Know exactly what would touch Summit.

To preserve Summit's stability and security, we must map exactly where an acquired system interfaces with our platform. No "hidden coupling" is permitted.

## 1. Standard Integration Surfaces

Every integration candidate must explicitly map to these four surfaces.

### Surface A: Data Ingress/Egress

- **Definition**: All pipelines, APIs, and batch processes that move data in or out.
- **Requirements**:
  - Must use Summit's standard Data Ingress Gateways.
  - Schema validation enforced at the boundary.
  - Rate limiting and quota management applied.

### Surface B: Identity & Access (IAM)

- **Definition**: User authentication, service-to-service auth, and permission checks.
- **Requirements**:
  - Federation with Summit OIDC/SAML.
  - Mapping of external roles to Summit RBAC/ABAC policies (OPA).
  - No separate "shadow" user databases for core access.

### Surface C: Agent/Capability Boundaries

- **Definition**: Functional APIs exposed to Summit's Agents or Orchestrator.
- **Requirements**:
  - Well-defined OpenAPI/GraphQL contracts.
  - Idempotency for agent-triggered actions.
  - Semantic versioning of capabilities.

### Surface D: Eventing & Workflows

- **Definition**: Pub/Sub topics, webhooks, and asynchronous triggers.
- **Requirements**:
  - CloudEvents standard format compliance.
  - Dead-letter queue configuration.
  - Tracing context propagation (OpenTelemetry).

## 2. Blast Radius Calculation

For each surface, a "Blast Radius" diagram must be produced.

- **L1 (Local)**: Failure only affects the integrated module.
- **L2 (Tenant)**: Failure affects a single tenant's experience.
- **L3 (Platform)**: Failure could degrade shared services (e.g., database lock contention, network saturation).

**Goal**: Keep all integrations at **L1** or **L2**. L3 risks require Executive Approval and significant re-architecture (Isolation Patterns).

## 3. Mapping Process

1.  **Discovery**: Candidate engineering team lists all external touchpoints.
2.  **Mapping**: Architect maps these to Surfaces A-D.
3.  **Gap Analysis**: Identify touchpoints that violate requirements.
4.  **Remediation Plan**: Define adapters or changes needed to conform.
