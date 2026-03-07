# Software Factory Subsumption Standard (StrongDM 2026)

Status: Active draft for governed adoption.

## Purpose

Define the Summit-ready interoperability surface for holdout scenarios, satisfaction scoring, and
local digital-twin validation. This standard codifies deterministic evidence outputs and the
required guardrails for a factory-grade, non-interactive pipeline mode.

## Scope

- Holdout scenario suites stored outside the agent-visible workspace where feasible.
- Probabilistic satisfaction scoring with auditable rubrics.
- Local digital twin universe (DTU-lite) for deterministic integration validation.
- Graph-structured, non-interactive pipeline phases with resumable checkpoints.

## Authority Files

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `agent-contract.json`

## Imports (Summit-original, inspired by StrongDM)

- OpenAPI specs for twins (optional).
- Recorded traces (redacted) for deterministic replay.
- Scenario YAML/MD definitions for holdout suites.
- Tool transcripts for non-interactive phase execution.

## Exports (deterministic)

- `report.json` (satisfaction + pass/fail gate summary).
- `metrics.json` (performance budgets, e.g., p95 latency).
- `stamp.json` (suite content hash + provenance).
- `junit.xml` (optional CI integration).

## Non-goals

- Full SaaS fidelity or production-grade API parity.
- Scraping proprietary APIs or bypassing abuse detection.
- Recommending “no human reviews ever” as a default posture.

## Claim Registry Mapping

- Holdout scenario suites + external storage: **ITEM:CLAIM-03**.
- Satisfaction metric + trajectory sampling: **ITEM:CLAIM-04**.
- DTU/twins framework + determinism: **ITEM:CLAIM-05**.
- Opaque implementation validation via behavior: **ITEM:CLAIM-06**.
- Non-interactive graph pipeline: **ITEM:CLAIM-07**.
- Filesystem-based memory substrate: **ITEM:CLAIM-08**.
- Evidence ID pattern, CI gates, security policies: **Summit original**.

## Minimal Winning Slice (MWS)

“Given a change request, Summit validates via holdout scenarios run against a local twin
universe, producing a deterministic `evidence.json` with a satisfaction score and pass/fail
policy gates.”

## Determinism Requirements

- No runtime timestamps inside JSON payloads.
- Sorted keys and stable ordering for deterministic artifacts.
- Evidence ID uses date-only stamp: `EVID-YYYYMMDD-<gitsha>-<suite>-<n>`.

## Gate Requirements

- `scenario-holdout-integrity` (suite hash unchanged).
- `satisfaction-threshold` (default 0.80 for MWS suites).
- `twin-no-network` (deny outbound network in tests).
- `evidence-determinism` (stable JSON, no timestamps).
