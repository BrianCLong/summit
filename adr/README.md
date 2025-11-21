# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Summit platform. ADRs document significant architectural decisions, their context, alternatives considered, and consequences.

## Quick Start

```bash
# List all ADRs
intelgraph adr:list

# Open a specific ADR
intelgraph adr:open 0001

# Filter by area
intelgraph adr:list --area data

# Filter by status
intelgraph adr:list --status accepted
```

## ADR Index

### Infrastructure & Deployment

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0001](0001-use-helm-terraform.md) | Use Helm and Terraform for Infrastructure | Accepted | Infrastructure | helm, terraform, iac |
| [0003](0003-firecracker-runtime-pooler.md) | Firecracker Micro-VM Pooler for MCP Runtime | Proposed | Infrastructure | runtime, performance, security |

### Auth & Security

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0002](0002-abac-step-up.md) | Attribute-Based Access Control with Step-Up Auth | Accepted | Auth/Security | abac, opa, webauthn, policy |

### Observability & Compliance

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0004](0004-deterministic-replay-engine.md) | Deterministic Replay Engine for MCP Sessions | Proposed | Observability | observability, compliance, dx |
| [0005](0005-disclosure-packager.md) | Ship Disclosure Packager | Accepted | Compliance | audit, sbom, attestation |

### Data & Storage

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0006](0006-neo4j-graph-store.md) | Neo4j as Primary Graph Store | Accepted | Data | neo4j, graph, cypher |
| [0009](0009-postgres-pgvector.md) | Postgres with pgvector for Vector Search | Accepted | Data | postgres, vector, embeddings |
| [0011](0011-provenance-ledger-schema.md) | Provenance Ledger Schema Design | Accepted | Data | provenance, ledger, timescale |

### API & Integration

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0007](0007-graphql-api-design.md) | GraphQL API Design & Schema Strategy | Accepted | API | graphql, api, schema |

### AI/ML & Copilot

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0012](0012-copilot-graphrag-architecture.md) | Copilot Architecture: GraphRAG + Policy | Accepted | AI/ML | copilot, graphrag, policy, ai |

### Multi-tenancy & Authorization

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0010](0010-multi-tenant-compartment-model.md) | Multi-Tenant Compartment Model | Accepted | Auth/Security | multi-tenant, isolation, compartments |

### Policy & Governance

| Number | Title | Status | Area | Tags |
|--------|-------|--------|------|------|
| [0008](0008-authority-license-compiler.md) | Authority & License Compiler Design | Accepted | Compliance | authority, licensing, compiler |

## ADR Areas

ADRs are categorized into the following areas:

- **Data**: Graph stores, databases, data modeling, schemas
- **AI/ML**: Machine learning systems, copilot, embeddings, GraphRAG
- **Infrastructure**: Deployment, orchestration, runtime, edge
- **Auth/Security**: Authentication, authorization, ABAC, step-up, multi-tenancy
- **API**: GraphQL, REST, schema design, integration
- **UX**: User experience, interfaces, workflows
- **Observability**: Monitoring, logging, tracing, replay
- **Compliance**: Auditing, provenance, attestation, SBOM

## ADR Status

- **Proposed**: Under discussion, not yet implemented
- **Accepted**: Decision made and implementation in progress or complete
- **Deprecated**: No longer relevant or applicable
- **Superseded**: Replaced by a newer ADR

## How We Use ADRs

See [How We Use ADRs](HOW_WE_USE_ADRS.md) for our process and guidelines.

## ADR Template

Use [adr-template.md](adr-template.md) when creating new ADRs. The template ensures consistency and completeness across all architectural decisions.

## CI Integration

Our CI pipeline checks for ADR updates when key areas are modified:

- **Auth/Security**: Changes to `services/authz-gateway`, `policy/`, auth-related services
- **Data**: Changes to graph models, database schemas, migrations
- **API**: Changes to GraphQL schemas, API endpoints
- **Copilot**: Changes to AI/copilot services, GraphRAG components
- **Provenance**: Changes to provenance ledger, attestation services

If foundational code is modified without a corresponding ADR update, CI will emit a warning.

## Creating a New ADR

1. Copy `adr-template.md` to a new file: `NNNN-short-title.md`
2. Use the next available number (check index above)
3. Fill in all sections, especially:
   - Context and decision rationale
   - Alternatives considered with pros/cons
   - Code references to actual implementation
   - Tests that enforce the decision
4. Update this README.md index
5. Submit PR with both ADR and implementation (or ADR first for proposed decisions)

## Questions?

For questions about ADRs or the architecture decision process, reach out to the Architecture Guild or see [How We Use ADRs](HOW_WE_USE_ADRS.md).
