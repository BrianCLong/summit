# Summit GA Execution Plan (Evidence-First)

Status: **Active**

Mode: **Reasoning**

## Readiness Assertion Alignment

This plan is aligned to the Summit Readiness Assertion and exists to compress the timeline to a
verifiable GA release with fully functioning features and governance-grade evidence.
See: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Objective

Deliver a GA-ready Summit/IntelGraph platform with all critical features operational and verified
under deterministic gates, evidence bundles, and policy-as-code enforcement.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, supply-chain drift,
  nondeterministic evidence
- **Mitigations**: deterministic gates, evidence-first artifacts, policy-as-code for compliance
  logic, least-privilege connector lifecycle, continuous monitoring hooks

## Scope (GA Critical Workstreams)

1. **Federation + Ingestion Mesh**
   - Complete Connector SDK & Registry.
   - Implement RSS/Atom connector.
   - Implement STIX/TAXII connector.
   - Enforce EvidenceBudget limits and deterministic ordering on queries.

2. **Governance Evidence Contracts**
   - Finalize evidence JSON schemas and parity checks.
   - Ensure CI gate coverage for OIDC/infra parity evidence.

3. **PromptSpec Foundation**
   - Finalize PromptSpec schema and policy gate scaffolding.
   - Validate prompt registry integrity for agent tasks.

4. **LongHorizon Orchestration**
   - Stabilize the evolutionary orchestration MVP and CLI tooling.
   - Add observability hooks for orchestration anomalies.

5. **Labs & Preview Conveyor**
   - Verify promotion gates and ensure release readiness for labs output.

## Evidence Requirements

- Every GA-critical change must emit evidence artifacts.
- Deterministic gates must pass: lint, format, typecheck, tests, smoke, and query determinism where
  applicable.
- Evidence bundles must be referenced in PR metadata.

## Deliverables

- Completed ingestion mesh connectors and registry.
- Governance evidence schema coverage with parity gates.
- PromptSpec policy enforcement verification.
- LongHorizon orchestration validation.
- Labs conveyor promotion gates with evidence.

## Timeline Compression

- Execute in one primary zone per PR (e.g., `server/` or `docs/`).
- Keep PRs atomic; require evidence-first outputs for each deliverable.

## Rollback Principle

All GA-critical changes must include reversible steps and documented rollback triggers.
