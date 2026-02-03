# Decisions — automation-turn-6

## DEC-001 — Ship Subsumption Bundle Framework before ITEM specifics
- **Decision:** Implement manifest + verifier + evidence schemas/index + deny fixtures first.
- **Why:** Enables safe, repeatable ingestion and prevents drift.
- **Alternatives rejected:** Start with feature code (rejected: higher blast radius, no gates).
- **Deferred:** ITEM-specific integration until excerpts/license known.
- **Risk tradeoff:** Minimal YAML parsing initially to avoid new deps.
- **GA alignment:** Strong — machine-verifiable governance artifacts.

## DEC-002 — Use Deterministic Evidence Schemas
- **Decision:** Enforce no timestamps in `report.json` and `metrics.json`.
- **Why:** To allow byte-for-byte comparison and caching.
- **Impact:** `stamp.json` is the only place where `created_at` is allowed.
