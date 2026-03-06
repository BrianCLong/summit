# Agentic Analytics 2026 Standard

## Purpose

Define the deterministic, auditable “agentic analytics” workflow contract for Summit. This
standard anchors readiness against `docs/SUMMIT_READINESS_ASSERTION.md` and mandates
artifact-level evidence first.

## Scope

- Deterministic analytics runs over tabular inputs (CSV or query extracts).
- Bounded autonomy for follow-up analysis (step/time/token budgets).
- Human-in-the-loop accountability and decision narratives.

## Non-Goals

- No autonomous external actions (tickets, outbound posts, or system writes).
- No UI dashboard changes in the minimal winning slice.

## Outputs (Deterministic)

- `report.json` — Findings (anomalies/risks), follow-ups, recommendations.
- `narrative.md` — Decision narrative (PII-redacted).
- `eval.json` — Policy + quality evaluations and guardrail outcomes.
- `metrics.json` — Budget and resource metrics.
- `stamp.json` — Deterministic run stamp (content hash + version only).

### Determinism Requirements

- Stable key ordering for all JSON outputs.
- No timestamps in deterministic artifacts.
- Floating-point outputs normalized to a stable precision.

## Evidence IDs

Format: `EVID/AA26/<dataset_hash>/<run_hash>/<artifact>`

- `dataset_hash`: content hash of the input dataset.
- `run_hash`: content hash of the deterministic report bundle.
- `artifact`: one of `report.json`, `narrative.md`, `eval.json`, `metrics.json`, `stamp.json`.

## Guardrails & Evals

- **PII Redaction**: Narrative must be redacted before persistence.
- **Prompt Injection**: Dataset strings must be sanitized and non-executable.
- **Autonomy Budgets**: Step/time/token budgets enforce bounded follow-ups.
- **Decision Clarity**: Report requires assumptions, confidence, and alternatives.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection, PII leakage, runaway autonomy, tool abuse.
- **Mitigations**: Sanitization, redaction, budget caps, audit logging, policy gates.

## Feature Flags

- `AGENTIC_ANALYTICS_ENABLED=false` by default.

## Governance Hooks

- Audit logging for inputs, outputs, and guardrail outcomes.
- Policy gates fail closed when evals indicate violations.

## Rollback

Revert docs-only changes and keep feature flag disabled.
