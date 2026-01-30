# Decisions — automation-turn-3

## DEC-001 — Ship Subsumption Bundle artifacts for link-only intake

- **Decision:** Implement manifest + evidence triad + fixtures + docs for the briefing bundle.
- **Why:** Establishes machine-verifiable governance while operating in MODE B link-only intake.
- **Alternatives rejected:** Delay bundle until full excerpts (rejected: stalls auditability).
- **Deferred:** ITEM-specific integration until excerpts/license are provided.
- **Risk tradeoff:** Minimal change set for low blast radius.

## DEC-002 — Deterministic Evidence First

- **Decision:** Keep `report.json` and `metrics.json` stable; timestamp only in `stamp.json`.
- **Why:** Deterministic evidence supports verification, caching, and audit reproducibility.
- **Impact:** Evidence remains merge-safe across runs.
