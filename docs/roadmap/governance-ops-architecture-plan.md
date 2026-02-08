# Governance Operations Plane — Architecture Plan (PR-1..PR-6)

## Sensing (UEF)

- Inputs:
  - Daily AI Governance Update scope (Incident Command, Model Supply-Chain Governance, Assurance Orchestrator).
  - Summit Readiness Assertion baseline.
- Constraints:
  - Evidence-first artifacts with deterministic outputs.
  - Policy-as-code enforcement at action boundary.
  - Single-zone: docs-only design artifact.

## Reasoning

The plan defines service boundaries, event schemas, and evidence artifacts to enable deterministic governance operations. The architecture aligns with governance mandates and enforces operational controls without runtime ambiguity.

## Authority & Alignment

- **Readiness anchor:** `docs/SUMMIT_READINESS_ASSERTION.md`.
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

## System Overview

### Core Services (Target)

1. **services/governance-ops/incident-command**
   - Incident containment, quarantine, rollback proposal, forensics export.
2. **services/governance-ops/model-supplychain**
   - Model registry, origin policy, usage attribution, risk scoring, decommissioning.
3. **services/governance-ops/assurance-orchestrator**
   - Control scheduling, review workflows, recertification gates, evidence packaging.
4. **services/evidence-ledger**
   - Append-only evidence index with hash chain and optional signatures.

### Shared Packages

- **packages/policy-engine**: deterministic policy evaluation (OPA/Rego or native DSL).
- **packages/telemetry**: normalized event schema and emitters.
- **packages/evidence-sdk**: evidence artifact generation + hash-chain stamping.
- **packages/decision-policy**: versioned policy definitions (mandated).

## Event Schema (Canonical, Minimal)

All events include `event_id`, `tenant_id`, `timestamp`, `actor`, `source`, `correlation_id`.

- **AIInteractionEvent**
  - `model_id`, `provider`, `prompt_ref`, `output_ref`, `redaction_level`, `policy_decision_id`.
- **AIActionEvent**
  - `tool`, `action`, `target`, `authorization`, `decision_trace_id`.
- **ModelUsageEvent**
  - `model_id`, `version`, `hosting`, `region`, `channel`, `attestation_id`.
- **ControlTestRunEvent**
  - `control_id`, `dataset_id`, `metrics_ref`, `pass_fail`, `evidence_id`.
- **IncidentEvent**
  - `incident_id`, `severity`, `scope`, `containment_actions`, `status`.

## Evidence Artifacts (Deterministic)

### Evidence ID Pattern

`EVID::<domain>::<object_type>::<stable_object_id>::<yyyymmdd>::<seq>`

### Required Artifacts

- `evidence/report.json` (human summary + links)
- `evidence/metrics.json` (strict schema, numeric + categorical)
- `evidence/stamp.json` (hash chain, build info, git sha, deterministic seed)

### Determinism Strategy

- Seeded simulation harness for evaluations.
- Stable ordering (`ORDER BY`) for any graph queries.
- Immutable event log with deterministic serialization.
- Hash chain computed over canonicalized JSON.

## Tenancy, Residency, Offline Mode

- **Tenancy:** strict `tenant_id` boundary enforced at policy engine.
- **Residency:** per-tenant data region controls; evidence export honors residency.
- **Offline:** evidence bundle export/import with verification and replay.

## Performance Budgets

- Quarantine decision < 1s P95.
- Evidence stamp generation < 2s P95 for 10k events.
- Supply-chain attribution coverage > 95% on staging.

## PR Plan (PR-1..PR-6)

1. **PR-1**: Governance event spine + evidence ledger.
2. **PR-2**: Incident Command MVP (quarantine + forensics bundle).
3. **PR-3**: Rollback & replay harness (deterministic).
4. **PR-4**: Model Supply-Chain Governance (origin policy + attestations).
5. **PR-5**: Assurance Orchestrator (reviews + recertification + evidence packs).
6. **PR-6**: Governance UX (command center, supplier risk, assurance calendar).

## Governed Exceptions

Legacy bypasses are recorded as **Governed Exceptions** with explicit evidence and rollback path.

## Finality

This plan is active and ready for execution without additional architectural dependencies.
