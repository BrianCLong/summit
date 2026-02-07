# Leadership Drift Standard

**Authority:** This standard inherits from the Summit Readiness Assertion and the governance
constitution. It codifies how Summit prevents velocity from outrunning accountable leadership.
See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness precedence.

## Purpose

Summit prevents leadership drift by requiring every automated decision/action to carry
accountable ownership, decision context, and rationale. The system enforces visibility,
measurable drift signals, and deny-by-default safeguards for high-risk automation.

## DecisionRecord v1 (Required)

DecisionRecords are mandatory for automated action proposals and executions when the
leadership drift gate is enabled.

**Required fields**

- `evidence_id` (string, deterministic, no timestamps)
- `owner` (string, accountable human or responsible role)
- `context.summary` (string, <= 500 chars)
- `rationale` (string)
- `category` (low | medium | high)
- `refs[]` (string, external IDs/URLs only)

**Optional fields**

- `context.assumptions[]` (string, each <= 200 chars)
- `context.risks[]` (string, each <= 200 chars)
- `presence_checkpoint` (object, required for `category=high`)
  - `approved_by` (string)
  - `approved_at` (build or run ID only)

## Enforcement Modes

- **OFF**: No validation, no denial, no metrics emission.
- **WARN**: Validate and emit metrics; do not block execution.
- **DENY**: Reject any action lacking required DecisionRecord fields (high-risk requires
  `presence_checkpoint`).

## Drift Signals (Metrics)

- `decisions_without_context`
- `owner_unknown`
- `unanswered_ownership_over_sla`

Metrics are emitted deterministically to the leadership drift artifact bundle.

## Import/Export Matrix

**Imports**

- Agent action proposals
- Workflow tasks
- Audit events

**Exports**

- DecisionRecord events
- Drift metrics (deterministic JSON)
- CI policy results

## Non-Goals

- Organizational design or HR tooling
- Sentiment analysis of humans
- LLM tone policing heuristics

## Determinism Requirements

- No timestamps in reports or metrics.
- Stable ordering of JSON keys.
- `evidence_id` must be derived from stable inputs only.

## Data Handling

DecisionRecords must be redacted and never log secrets, raw prompts, or customer identifiers.
See `docs/security/data-handling/leadership-drift.md`.

## MAESTRO Threat-Model Alignment

**MAESTRO Layers:** Foundation, Agents, Tools, Observability, Security

**Threats Considered**

- Goal manipulation by missing ownership
- Prompt injection leading to unowned actions
- Tool abuse without contextual accountability

**Mitigations**

- Mandatory `owner` + `context.summary` + `rationale`
- High-risk `presence_checkpoint` gate
- Deterministic audit emissions with redaction

## Governance Hooks

- CI policy gate for DecisionRecord conformance
- Audit trail entries for every gated action
- Evidence artifacts published in `artifacts/leadership-drift/`

## Readiness Assertion

This standard is aligned to the Summit Readiness Assertion and enforces the mandate that
velocity never outruns accountable leadership.
