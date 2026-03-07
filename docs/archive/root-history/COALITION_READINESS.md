# Coalition Readiness & Execution Constitution

**Context**: This document defines the operational directives for **Epics 4–6**, establishing the "Coalition-Deployable" standard. It serves as the primary constitution for Jules, Claude, and all autonomous agents working on the IntelGraph platform.

## 1. Prime Directive: The "Coalition-Deployable" Standard

All architecture and implementation must adhere to strict multi-tenant isolation, verifiable security, and predictable reliability. "Coalition-Deployable" is defined by:

- **Tenant Isolation**: Strict logical separation of data and compute per tenant.
- **Encryption**: Mandatory encryption at rest and in transit, with tenant-scoped keys.
- **Error Budgets**: Explicit error budgets defined and enforced per service.

### The "No Surprises" Clause

Any new attack surface or feature introduction must satisfy the following **before** merge:

1.  **CI Coverage**: Automated tests (unit, integration, e2e) must cover the new surface.
2.  **SLOs**: Service Level Objectives (latency, availability) must be defined.
3.  **Tenant-Aware Authorization**: Every endpoint and data access path must enforce tenant boundaries via OPA or equivalent middleware.

## 2. Zero-Knowledge Deconfliction (Epic 4)

### Protocol Specification

The Private Set Intersection (PSI) implementation must utilize the **OPRF-based PSI** protocol family.

- **Modes**:
  - `full_intersection`: Returns the actual intersecting elements.
  - `intersection_cardinality`: Returns only the count of intersecting elements.

### Constraints & Performance

- **Cryptographic Strength**: Minimum **128-bit security** for all primitives.
- **Latency**: Maximum PSI roundtrip time must be defined (e.g., < 200ms for 1k items).
- **Optimization**: Use elliptic curve batches or equivalent optimizations to minimize computation.

### Explainability

- **Denial Reason Codes**: When a match is denied or filtered, the system must return a **non-sensitive policy reason code** (e.g., `POLICY_GEO_BLOCK`, `THRESHOLD_NOT_MET`), strictly avoiding free-form text explanations that could leak data.

## 3. Streaming Intelligence Backbone (Epic 5)

### Technology Stack

The streaming backbone is strictly pinned to:

- **Ingestion/Bus**: Kafka
- **Processing**: Flink
- **Storage (Lakehouse)**: Iceberg
- **Hot Store**: Redis / KeyDB

### Data Governance

- **Schema Evolution**: All schema changes must be managed via a schema registry with strictly defined compatibility rules (backward/forward compatibility).
- **Determinism**: Replay from Kafka to Iceberg (via Flink) must be **bit-identical** within a defined tolerance window.

### Drift Detection

- **SLA**: Drift detection must occur within **N minutes** (configurable).
- **Quarantine**: Detected drift must trigger quarantine of affected data batches **before** they land in the offline/serving store.

## 4. Multi-Tenant Isolation & Resilience (Epic 6)

### Key Management (KMS)

- **Per-Tenant Keys**: Every tenant must have a dedicated encryption key (or key hierarchy).
- **Scoping**: Keys must be strictly scoped to the tenant's resources; cross-tenant key usage is a critical failure.

### Blast Radius & Isolation

- **Resilience Testing**: Chaos engineering and fuzz testing must demonstrate that a "noisy neighbor" or compromised tenant cannot violate the SLOs of VIP tenants.
- **Resource Partitioning**:
  - **Caches**: Must be tenant-prefixed (e.g., `tenant:{id}:key`).
  - **Queues**: Must be logically partitioned or tenant-tagged.
  - **Feature Stores**: Must enforce tenant isolation at the storage or access layer.

## 5. Policy, Provenance, & Observability

### Provenance Manifests

Every data mutation or policy decision must generate a structured provenance manifest containing:

- `tenant_id`: The tenant context.
- `policy_version`: Hash/ID of the active policy.
- `schema_version`: Version of the data schema.
- `input_hash`: Cryptographic hash of the input data.

### Multi-Tenant Observability

- **Dashboards**: Default views must be **per-tenant**, with aggregate rollups available for platform operators.
- **SLOs**: Alerts and objectives must be definable and trackable at the tenant level.

### "Governance by Construction"

- **Guardrail**: No policy or schema change can be merged unless it is reflected in:
  1.  **OPA/LAC Rules**: The enforcement layer.
  2.  **Provenance Schema**: The audit layer.

## 6. Directory & File Contracts

To ensure architectural consistency, the following directory structures are mandated for Epics 4–6:

### Zero-Knowledge Deconfliction (Epic 4)

- **Primary Logic**: `server/src/security/psi/`
- **Interfaces**: `server/src/security/psi/types.ts`
- **Tests**: `server/src/security/psi/__tests__/`

### Streaming Intelligence (Epic 5)

- **Core Library**: `server/src/lib/streaming/`
- **Ingestion Service**: `server/src/services/StreamingIngestionService.ts`
- **Connectors**: `server/src/connectors/streaming/`

### Multi-Tenant Isolation (Epic 6)

- **Tenancy Logic**: `server/src/tenancy/`
- **Tenant Service**: `server/src/services/TenantService.ts`
- **Isolation Middleware**: `server/src/middleware/tenancy.ts`

### Provenance & Observability

- **Ledger**: `server/src/provenance/`
- **Observability Lib**: `server/src/lib/observability/`
- **Telemetry**: `server/src/lib/telemetry/`
