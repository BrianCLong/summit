# Decisions — automation-turn-3

## DEC-001 — Ship Subsumption Bundle artifacts for link-only intake

- **Decision:** Implement manifest + evidence triad + fixtures + docs for the AI platform update bundle.
- **Why:** Establishes machine-verifiable governance while operating in MODE B link-only intake.
- **Escalation:** Summit Readiness Assertion is the governing authority for readiness posture (`docs/SUMMIT_READINESS_ASSERTION.md`).
- **Alternatives rejected:** Delay bundle until full excerpts (rejected: stalls auditability).
- **Deferred pending:** ITEM-specific integration until excerpts/license are provided.
- **Risk tradeoff:** Minimal change set for low blast radius.

## DEC-002 — Deterministic Evidence First

- **Decision:** Keep `report.json` and `metrics.json` stable; timestamp only in `stamp.json`.
- **Why:** Deterministic evidence supports verification, caching, and audit reproducibility.
- **Impact:** Evidence remains merge-safe across runs.

## MAESTRO Threat Modeling Summary

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** Prompt injection, tool abuse, evidence tampering, manifest drift.
- **Mitigations:** Deterministic evidence outputs, deny-by-default fixtures, evidence index enforcement, audit-friendly docs.
