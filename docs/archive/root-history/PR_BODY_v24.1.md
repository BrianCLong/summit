**Title:** v24.1 — Hardening & Ops (E1–E7)

### What

- Complete ingest scaffolds; Redis cache; RPS limiter; residency guard; fine‑grained scopes; retention dry‑run; subscription metrics; trace sampling; chaos hooks.

### Why

- Improve resilience, cost, and policy assurances; validate end‑to‑end SLOs.

### SLOs

- Read p95 ≤ 350 ms; Write p95 ≤ 700 ms; Err ≤ 0.1%; Sub fan‑out p95 ≤ 250 ms; Ingest p95 ≤ 100 ms pre‑storage.

### Evidence

- Attach `.evidence/v24.1/*` from CI artifacts.

### Rollback

- Feature flag off `v24.coherence=false`; Helm rollback; disable cache layer.
