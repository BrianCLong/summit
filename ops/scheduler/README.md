# Global Work Scheduler & Fair-Share Planner (Prompt #70)

- **Feature flag:** `GWSP_ENABLED` (default: false)
- **APIs:** POST `/submit`, GET `/queue`, POST `/preempt`, GET `/forecast`
- **Rules:** fair-share tokens; preemptible slots; no PII in metadata; residency/budget aware
- **Defaults:** priorities P0–P3; grace P0 none, P1 120s, P2 60s, P3 15s; p95 submit→start ≤500ms
- **Tests:** simulated workloads, SLA adherence, fairness proofs, adapter coverage
