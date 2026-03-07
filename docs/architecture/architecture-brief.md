# Architecture Brief: Summit + companyOS v1 Foundation

## Scope and Audience
Summit is an AI-augmented intelligence analysis platform focused on governed, multi-tenant workflows across ingestion, enrichment, graph analytics, and analyst outcomes. companyOS is the authoritative tenant/org layer that defines accounts, roles, entitlements, budgets, and policies consumed by Summit runtime modules. This brief is written for engineering, security, and release owners who must enforce governance and evidence contracts end-to-end. This baseline aligns to the Summit Readiness Assertion and governance constitution to make readiness explicit and enforceable across module boundaries.

## Modules and Responsibilities (v1 Foundation)
- **companyOS**: source of truth for orgs, accounts, roles, entitlements, budgets, and policies; issues deterministic policy decisions and read-only organization facts.
- **Summit Core**: product workflows and orchestration; consumes companyOS facts and policy outcomes.
- **Switchboard**: tool and flow runtime; enforces companyOS decisions before flow/tool execution.
- **Maestro**: job runtime; enforces companyOS decisions before job execution and records decision references on runs.
- **IntelGraph**: evidence and provenance custody; stores policy decisions, run artifacts, and boundary events.
- **Edge/Gateway**: ingress/auth/tenant boundary; injects actor and org context into Summit flows.

## Boundary Contract Summary
All cross-module contracts are explicit, typed, and deny-by-default at enforcement points. companyOS is governance and policy home. IntelGraph is evidence and provenance home. No flow, tool, or job executes without policy context.

## End-to-End Data Flow (Golden Path)
1. **Ingest**: Summit Core requests ingestion via Switchboard (`FLOW_RUN` / `TOOL_INVOKE` policy check).
2. **Enrich**: Switchboard invokes tools only after allow decisions from companyOS.
3. **Persist Evidence**: Summit and runtimes write deterministic evidence artifacts and decision records to IntelGraph.
4. **Analyze**: Summit reads graph/evidence outputs for analyst workflows.
5. **Audit**: Evidence index remains canonical for export, review, and compliance.

## v1.0 Acceptance Criteria
- A single authoritative source for orgs, roles, entitlements, budgets, and policies exists in companyOS.
- Switchboard and Maestro refuse execution when companyOS denies policy.
- Every enforcement decision emits deterministic evidence artifacts (`report.json`, `metrics.json`, `stamp.json`, `evidence/index.json`).
- A local golden-path workflow runs via compose with a seeded first org.

## MAESTRO Threat Model Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: cross-tenant access, tool misuse, budget bypass, policy bypass, evidence tampering.
- **Mitigations**: mandatory org context, deny-by-default evaluation, bounded runtime enforcement hooks, deterministic decision IDs, evidence schema and index validation.

## Assumptions and Validation Plan
- **Assumption (Deferred pending runtime boundary validation)**: IntelGraph, Maestro, and Switchboard can be deployed independently even if currently co-located.
- **Assumption (Deferred pending infra profile validation)**: Neo4j/Postgres/Redis/Qdrant can be profile-optional depending on deployment tier.
- **Validation Plan**: verify live entrypoints and router paths; align contract docs and runtime policy hook points to actual service boundaries and environment profiles.

## Finality
This brief is the v1 foundation baseline. Any exceptions are governed exceptions and must be recorded against readiness and governance authority files before merge.
