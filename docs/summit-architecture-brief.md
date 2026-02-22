# Summit Architecture Brief (v1.0)

## What Summit is
Summit is an agentic AI OSINT platform that combines knowledge graphs, real-time ingestion, and orchestration to deliver evidence-backed intelligence workflows for analysts and operators.【F:README.md†L1-L63】

## Who it is for
Summit serves intelligence and security teams that need repeatable, auditable analysis across diverse data sources with governed automation and provenance-first outputs.【F:README.md†L1-L121】【F:docs/architecture/prov-ledger.md†L1-L43】

## Module boundaries (first-class contracts)
**CompanyOS is the tenant/org control plane. Summit core consumes CompanyOS facts and policies as read-only constraints.** CompanyOS owns orgs, users, teams, roles, policies, audit events, and the multi-tenant contract (REST/OpenAPI + PostgreSQL/Prisma).【F:docs/companyos-multi-tenant-architecture.md†L1-L199】

| Boundary | Owns writes | Provides (typed API surface) | Consumes | Governance authority |
| --- | --- | --- | --- | --- |
| **CompanyOS ↔ Summit** | CompanyOS owns tenant identity, roles, policies, and audit events. Summit reads and enforces. | CompanyOS REST API (`/api/v1`) + OpenAPI contract with tenant-scoped authZ hooks and audit events.【F:docs/companyos-multi-tenant-architecture.md†L99-L199】 | Summit core reads orgs/users/roles/policies to gate actions and budgets. | Policy definition and identity authority live in CompanyOS; Summit enforces. |
| **Summit ↔ IntelGraph** | IntelGraph owns graph data, evidence, and provenance writes. | Graph and provenance surfaces plus evidence chain handling; provenance ledger registers evidence and claim chains.【F:README.md†L74-L91】【F:docs/architecture/prov-ledger.md†L1-L43】 | Summit and Switchboard publish evidence and graph updates. | IntelGraph enforces integrity and provenance guarantees. |
| **Summit ↔ Maestro** | Maestro owns workflow runs, retries, and orchestration state. | Orchestration with multi-stage workflows and durable job queues.【F:README.md†L74-L91】【F:docs/SUMMIT_READINESS_ASSERTION.md†L21-L31】 | Summit issues jobs; Maestro emits run logs and SLO signals. | Maestro enforces execution policies; CompanyOS defines policies. |
| **Summit ↔ Switchboard** | Switchboard owns ingestion, normalization, enrichment, and routing. | Event ingestion and routing into core services.【F:README.md†L74-L91】 | Summit consumes normalized events and enrichment outputs. | CompanyOS policies gate routing; IntelGraph captures evidence. |

## Data flow (golden path)
1. **Ingest**: Switchboard pulls streams and normalizes events into Summit services.【F:README.md†L74-L121】
2. **Evidence + graph**: IntelGraph validates schema and records provenance; Provenance Ledger captures immutable evidence and claims.【F:docs/SUMMIT_READINESS_ASSERTION.md†L15-L23】【F:docs/architecture/prov-ledger.md†L1-L43】
3. **Orchestrate**: Maestro runs multi-stage workflows with durable queues and observability.【F:docs/SUMMIT_READINESS_ASSERTION.md†L21-L31】
4. **Deliver**: Summit surfaces analyst-ready outputs via APIs and UI, backed by evidence and policy constraints.【F:README.md†L1-L121】【F:docs/architecture/prov-ledger.md†L1-L43】

## Governance & security in the OS
- **Identity and policy authority**: CompanyOS is the tenant control plane with explicit role/policy enforcement and audit events for every write.【F:docs/companyos-multi-tenant-architecture.md†L99-L199】
- **Evidence-first posture**: IntelGraph and the Provenance Ledger register immutable evidence chains for disclosure and auditability.【F:docs/architecture/prov-ledger.md†L1-L70】
- **Readiness assertion**: Summit’s readiness is governed as a certified state with enforced invariants (security, quality, compliance).【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L48】

## Packaging & deployability
Summit ships as a composable stack with container-based deployment options (Docker Compose and Kubernetes manifests) covering services and UI entrypoints.【F:README.md†L162-L186】

**Stack layers**
- **Base**: IntelGraph graph + provenance storage engines and migrations.【F:README.md†L74-L91】【F:docs/architecture/prov-ledger.md†L1-L70】
- **Services**: CompanyOS, Summit core, Maestro, Switchboard (each service encapsulates its own APIs and persistence contract).【F:README.md†L74-L91】【F:docs/companyos-multi-tenant-architecture.md†L1-L199】
- **Edge**: API gateway, UI, and SDKs for tenant/admin experiences and analyst workflows.【F:README.md†L1-L144】

## v1.0 acceptance criteria
- **CompanyOS contract**: Multi-tenant API contract with orgs, roles, policies, and audit events is authoritative and enforced across Summit workflows.【F:docs/companyos-multi-tenant-architecture.md†L1-L199】
- **IntelGraph integrity**: Ingestion pipeline validates schema and maintains immutable provenance guarantees.【F:docs/SUMMIT_READINESS_ASSERTION.md†L15-L23】
- **Maestro orchestration**: Multi-stage workflows run on durable queues with monitored latency/failure rates.【F:docs/SUMMIT_READINESS_ASSERTION.md†L21-L31】
- **Switchboard routing**: Ingestion, normalization, and routing are active system responsibilities for Summit’s core services.【F:README.md†L74-L121】
- **Evidence-first outputs**: Provenance Ledger produces verifiable disclosure bundles for audit-ready delivery.【F:docs/architecture/prov-ledger.md†L1-L70】
- **Deployability**: Docker Compose or Kubernetes deployment paths are documented and runnable for a seeded tenant stack.【F:README.md†L162-L186】

## MAESTRO security alignment (design-time summary)
- **MAESTRO Layers**: Foundation Models, Data Operations, Agents, Tools, Infrastructure, Observability, Security & Compliance.【F:docs/security/threat-modeling-framework.md†L16-L46】
- **Threats Considered**: prompt injection, data poisoning, tool abuse, over-autonomy, container escape, and audit gaps.【F:docs/security/threat-modeling-framework.md†L48-L120】
- **Mitigations**: schema validation, deterministic guardrails, least privilege, and continuous monitoring hooks aligned to MAESTRO expectations.【F:docs/security/threat-modeling-framework.md†L48-L83】

## Summit readiness assertion (governance reference)
Summit operates under a binding readiness assertion; deviations are governed exceptions and must be tracked explicitly.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L66】
