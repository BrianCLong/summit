# Maestro Spec Interview Standard

## Purpose

Define the deterministic spec-generation contract for `maestro_spec_interview_v1`.

## Exports

- `artifacts/maestro/<slug>/spec_bundle.json`
- `artifacts/maestro/<slug>/report.json`
- `artifacts/maestro/<slug>/metrics.json`
- `artifacts/maestro/<slug>/stamp.json`

## Determinism Rules

- `spec_bundle.json`, `report.json`, and `metrics.json` are deterministic.
- `stamp.json` is the only artifact that may include timestamps.
- Requirement IDs are stable (`REQ-<SECTION>-<NNN>`).

## Interop Mapping

- Jules import: `jules_tasks`
- Codex import: `codex_tasks`
- Observer import: `report.json` and `metrics.json`

## Gate Conditions

The run fails when:
- Any required section is missing.
- Any section summary is missing.
- Requirement IDs are missing.
- Definition-of-done score is below 20/25.
- Blocking open questions remain unresolved.

## MAESTRO Security Alignment

- MAESTRO Layers: Agents, Tools, Observability, Security.
- Threats Considered: Prompt ambiguity, contradictory constraints, sensitive data leakage in artifacts.
- Mitigations: Required section summaries, contradiction scan, deterministic artifacts, and secret-safe data handling rules.

## Non-goals

- Autonomous code generation.
- Compliance certification without explicit control mappings.
