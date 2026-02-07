# Architecture Brief: Summit + companyOS v1 Foundation

## Scope and Audience
Summit is an AI-augmented intelligence analysis platform focused on governed, multi-tenant workflows across ingestion, enrichment, graph analytics, and analyst outcomes. companyOS is the authoritative tenant/org layer that defines accounts, roles, entitlements, budgets, and policies consumed by Summit runtime modules. This brief is written for engineering, security, and release owners who must enforce governance and evidence contracts end-to-end. This brief aligns with the Summit Readiness Assertion and the governance constitution to make readiness explicit, not implied. It does not defend legacy paths; it asserts the present and dictates the required future state. 【Move to paper by citing authoritative files: docs/SUMMIT_READINESS_ASSERTION.md, docs/governance/CONSTITUTION.md】

## Modules and Responsibilities (v1 Foundation)
- **companyOS**: source of truth for orgs, accounts, roles, entitlements, budgets, and policies. Emits deterministic policy decisions and supports read-only fact queries.
- **Summit Core**: product workflows and orchestration; consumes companyOS facts and decisions.
- **Switchboard**: tool and flow execution; enforces companyOS decisions at runtime.
- **Maestro**: job scheduling and execution; enforces companyOS decisions for jobs and run metadata.
- **IntelGraph**: evidence/provenance storage; stores policy decisions, run evidence, and governance records.
- **Edge/Gateway**: ingress, auth, and tenancy boundary; routes to core services.

## Boundary Contract Summary
All cross-module contracts are explicit, typed, and deny-by-default at enforcement points. companyOS remains the authoritative policy home; IntelGraph remains the evidence home. No runtime may execute a flow, tool, or job without a policy decision in scope.

## End-to-End Data Flow (Golden Path)
1. **Ingest**: Summit Core requests ingestion via Switchboard (policy check: FLOW_RUN/TOOL_INVOKE).
2. **Enrich**: Switchboard invokes tools with companyOS policy decision attached.
3. **Evidence**: IntelGraph stores evidence artifacts and decision records.
4. **Analyze**: Summit Core reads IntelGraph outputs for analyst review.
5. **Audit**: Evidence index remains the canonical export list for governance and compliance.

## v1.0 Acceptance Criteria
- A single authoritative source for orgs, roles, entitlements, budgets, and policies exists in companyOS.
- Switchboard and Maestro refuse execution when companyOS denies policy.
- Every enforcement decision emits evidence artifacts (report, metrics, stamp, index).
- A golden-path workflow runs locally via compose with a seeded first org.

## MAESTRO Threat Model Alignment (Required)
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: cross-tenant access, tool misuse, budget bypass, prompt/tool drift, evidence tampering, policy bypass.
- **Mitigations**: orgId required in all contexts; deny-by-default policies; enforcement hooks in Switchboard/Maestro; deterministic decision IDs; evidence schemas and index gating; runtime observability for decision allow/deny rates.

## Assumptions and Validation Plan
- **Assumption (Deferred pending validation)**: IntelGraph, Maestro, Switchboard are separable runtime modules even if co-located.
- **Assumption (Deferred pending validation)**: Neo4j/Postgres/Redis/Qdrant may be optional in certain deployments.
- **Validation Plan**: Inspect current service boundaries and entrypoints, then align contracts and port mappings with actual routing paths.

## Finality
This brief is the v1 foundation lane baseline. Any deviation must be proposed as a governed exception and recorded against the authoritative governance files referenced above.
