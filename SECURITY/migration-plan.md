# Migration Plan

- Change type: (add column, split table, index, etc.)
- Risk class: (low/med/high)
- Steps:
  1. Expand: forward‑compatible DDL
  2. Backfill: idempotent job spec
  3. Dual‑write: flag name & rollout
  4. Switch reads: flag name & metrics
  5. Contract: remove old path (after ≥7d)
- Rollback: (flags to flip; data to restore)
- Owner + on‑call:
