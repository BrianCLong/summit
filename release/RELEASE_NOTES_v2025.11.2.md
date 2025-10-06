## IntelGraph — November 2025 Release (v2025.11.2)

**Summary:** 70/70 points across Nov Sprints 1–2. 100% delivery.

### Highlights

- Policy Intelligence v1: AUC ≥0.80, drift ≤5m SLO, 1-click rollback w/ audit, multi-channel notifs.
- Inventory Graph UI v1: GraphQL schema, force-directed viz, attack path preview, ownership context, PNG export.
- SOAR v1.4 Scale & Safety: 100 ops/sec idempotent bulk, circuit breakers, retries w/ exp backoff, priority queues.
- Intel v4 Active Learning Beta: privacy-safe feedback, batch retrain (Brier ≤0.15), canary 10→100%, model registry v4.
- Observability & Enablement: 15+ SLO alerts with runbooks, PD/Slack routing, comprehensive monitoring.

### Validations

- ✅ CI unit/integration + Playwright
- ✅ k6 bulk ops @docs/legacy-top100.txt ops/sec (≤1% errors)
- ✅ Model metrics meet thresholds (AUC/Brier)
- ✅ SLO alerts green in Grafana

### Rollout

- Canary: 10%→50%→100% with auto-rollback on SLO breach.
- Runbooks: policy-drift.md, model-quality.md.

### Risk/Backout

- `helm rollback intelgraph <prev-release>`; provenance of rollback captured in audit ledger.
