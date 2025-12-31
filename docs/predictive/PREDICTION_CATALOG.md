# Prediction Catalog (Bounded, Explainable, Policy-Safe)

This catalog enumerates the only permitted prediction classes for the **Advanced Predictive Analytics (Bounded, Explainable, Policy-Safe)** sprint. Each class is explicitly scoped, bounded, and paired with approved horizons, consumers, and safety notes.

## Principles

- **No black boxes:** every prediction must expose inputs, rationale, confidence, and limits.
- **Bounded horizons:** only short/near-term forecasts are allowed; no unbounded extrapolation.
- **Policy-first:** policy gates and cost caps precede any computation.
- **Explainable & reproducible:** operators can replay predictions using preserved inputs and code snapshots.

## Catalog

### 1. Capacity Exhaustion (Near-Term)

- **Question:** Where are we likely to exhaust capacity within the bounded horizon?
- **Signals:** ingest rate, queue depth, CPU/memory saturation, per-tenant concurrency, autoscaling events.
- **Horizon:** 1h, 24h.
- **Consumers:** operators, SREs (automation eligible once calibration meets threshold).
- **Outputs:** probability of exhaustion per domain (service, cluster, tenant), confidence band, top drivers, replay token.
- **Limits:** forbid forecasts beyond 24h; disallow if >10% source metrics missing or stale >5m.

### 2. Cost Overrun Risk (Per Tenant / Agent)

- **Question:** Which tenants or agents are likely to exceed budget envelopes?
- **Signals:** recent spend velocity, reserved vs on-demand mix, model invocation counts, storage growth, egress.
- **Horizon:** 24h, 7d.
- **Consumers:** finance ops, tenant success (human-only until calibration passes).
- **Outputs:** probability of overrun, projected delta vs budget, confidence band, dominant spend drivers.
- **Limits:** enforce per-request cost caps; suppress output if driver coverage <80%.

### 3. SLA Breach Risk

- **Question:** Which services/tenants are at risk of missing SLA SLOs?
- **Signals:** latency/error budgets, saturation, deployment change velocity, incident proximity, rollout blast radius.
- **Horizon:** 1h, 24h.
- **Consumers:** SRE, support (automation-eligible for paging logic only after backtest acceptance).
- **Outputs:** breach probability, expected shortfall, confidence band, comparable past incidents.
- **Limits:** disable if SLO definition missing or stale; require provenance to specific SLO artifact.

### 4. Policy Denial Surge Risk

- **Question:** Are we approaching a surge in policy denials (e.g., rate limiting, RBAC, data residency)?
- **Signals:** policy-engine decisions, request mix shifts, geo/tenant distribution, recent rule changes, cache hit/miss.
- **Horizon:** 1h, 24h.
- **Consumers:** policy admins, support (human-only; no auto-mitigation).
- **Outputs:** surge probability, impacted rules, expected denial volume, confidence band, recent rule deltas.
- **Limits:** block predictions if policy version provenance is unknown or unpinned.

### 5. Ingestion Backlog Growth

- **Question:** Where will ingestion queues back up within the horizon?
- **Signals:** ingest throughput vs capacity, parser/transform failure rates, upstream feed jitter, connector health, retry storms.
- **Horizon:** 1h, 24h.
- **Consumers:** ingestion ops (automation-eligible for throttling suggestions only after calibration).
- **Outputs:** backlog growth probability, expected queue depth, top blocking connectors, confidence band.
- **Limits:** disable if connector health telemetry coverage <90% or if retry telemetry absent.

## Out-of-Scope Predictions

- Long-range (>7d) forecasts.
- Any prediction without provenance-bound inputs and reproducible replay.
- Autonomous actions without explicit human approval and policy clearance.
