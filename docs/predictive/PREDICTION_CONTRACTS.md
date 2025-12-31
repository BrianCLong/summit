# Prediction Contracts

Prediction contracts define the mandatory schema for inputs, processing, outputs, and controls for every prediction class in `PREDICTION_CATALOG.md`. No prediction may execute without a contract that satisfies these requirements.

## Contract Template

- **id:** Stable identifier (e.g., `capacity-exhaustion`).
- **version:** Semantic version of the contract.
- **horizons:** Allowed horizons and granularity.
- **inputs:** Metrics/features with provenance (source system, freshness SLA, coverage threshold).
- **preconditions:** Validation gates (data completeness, policy checks, cost caps).
- **method:** Modeling approach and rationale (e.g., bounded ETS, calibrated quantile regression). Black-box models are forbidden.
- **outputs:** Required fields: prediction value(s), confidence band, rationale (top-k contributors), limits, replay token, provenance hash.
- **consumers:** Allowed consumers (human-only vs automation-eligible) and notification channels.
- **controls:** Rate limits, budgets, and feature flags for disable/kill-switch.
- **evidence:** Links to input queries, training/fit snapshots (if applicable), and comparable history windows.
- **replay:** How to recompute for a past timestamp (inputs, snapshot, code/version pin).
- **governance:** Policy checks, audit fields, and escalation path for violations.

## Concrete Contracts

### Capacity Exhaustion

- **id:** `capacity-exhaustion`
- **version:** 1.0.0
- **horizons:** 1h, 24h
- **inputs:**
  - Workload: ingest rate, queue depth, per-tenant concurrency (freshness ≤5m, coverage ≥90%).
  - Resource: CPU, memory, disk IO, network saturation (freshness ≤2m, coverage ≥95%).
  - Scaling: autoscale events, quota limits, maintenance windows.
- **preconditions:**
  - Reject if any critical metric freshness exceeds SLA.
  - Enforce per-request compute budget before feature extraction.
  - Verify policy access for tenant-level insights (RBAC + data residency).
- **method:** Bounded quantile regression (p50/p90) with seasonality-aware baselines; fallback to deterministic thresholds when coverage drops.
- **outputs:**
  - Probability of exhaustion per domain (service/cluster/tenant), p50/p90 band, top contributors, replay token, provenance hash (inputs + model version).
  - Limits field describing disabled horizons and missing data notes.
- **consumers:** Operators, SREs; automation-eligible for alert routing only after calibration threshold is met.
- **controls:** Per-tenant rate limit; budget cap enforced per request and per 24h window; feature flag `predictions.capacity.enabled`.
- **evidence:** Links to metrics queries (PromQL/SQL), autoscale logs, change windows.
- **replay:** `scripts/predict/replay_capacity.sh --timestamp <iso> --horizon <1h|24h> --tenant <id>` (replays using pinned snapshot + inputs).
- **governance:** Audit record with requester, purpose, policy version, and cost consumed; fail closed on any violation.

### Cost Overrun Risk

- **id:** `cost-overrun`
- **version:** 1.0.0
- **horizons:** 24h, 7d
- **inputs:**
  - Spend telemetry by tenant/agent, commit rate of reserved vs on-demand, model invocation counts, storage growth, egress metrics.
  - Budget envelopes and policy caps per tenant; pricing sheet version.
- **preconditions:**
  - Deny if budget config missing or pricing sheet unpinned.
  - Apply per-request cost ceiling before execution.
  - Require at least 30h of recent spend data; otherwise degrade to threshold-based warning.
- **method:** Constrained spend-velocity projection with calibrated uncertainty (MAE target <10%); forbids extrapolation beyond 7d.
- **outputs:** Overrun probability, projected delta vs budget, driver attribution, confidence band, replay token, provenance hash.
- **consumers:** Finance ops, tenant success; human-only until calibration acceptance.
- **controls:** Per-tenant/day cost cap; rate limit per tenant; feature flag `predictions.cost.enabled`.
- **evidence:** Query links to billing tables, model invocation logs, storage/egress telemetry; pricing sheet version.
- **replay:** `scripts/predict/replay_cost.sh --tenant <id> --horizon <24h|7d> --timestamp <iso>`.
- **governance:** Audit includes pricing sheet version, requester role, and applied caps; fails closed on missing budgets.

### SLA Breach Risk

- **id:** `sla-breach`
- **version:** 1.0.0
- **horizons:** 1h, 24h
- **inputs:** Latency/error budget burn, saturation, deployment cadence, incident proximity, rollout scope.
- **preconditions:**
  - Require active SLO definition with provenance to SLO catalog entry.
  - Deny if more than 5% telemetry missing per SLI dimension.
- **method:** Bounded hazard-style risk scoring combining recent burn-rate trends and deployment risk modifiers.
- **outputs:** Breach probability, expected shortfall, confidence band, historical comparables, replay token, provenance hash.
- **consumers:** SRE, support (automation-eligible for paging thresholds after calibration).
- **controls:** Per-service rate limits; feature flag `predictions.sla.enabled`; per-request compute budget.
- **evidence:** Links to SLO definitions, burn-rate dashboards, change history.
- **replay:** `scripts/predict/replay_sla.sh --service <id> --timestamp <iso> --horizon <1h|24h>`.
- **governance:** Audit includes SLO version, requester, and burn-rate window; fail closed if SLO missing.

### Policy Denial Surge Risk

- **id:** `policy-denial-surge`
- **version:** 1.0.0
- **horizons:** 1h, 24h
- **inputs:** Policy decision logs, rule change history, geo/tenant mix, request mix, cache hit/miss, latency under load.
- **preconditions:**
  - Require pinned policy bundle hash; deny if absent.
  - Ensure policy decision logs cover ≥95% of requests in the window.
- **method:** Change-point detection over decision rates with bounded projection using recent request mix deltas.
- **outputs:** Surge probability, impacted rules, expected denial volume, confidence band, replay token, provenance hash.
- **consumers:** Policy admins, support (human-only).
- **controls:** Per-tenant and global rate limits; feature flag `predictions.policy.enabled`; per-request cost ceiling.
- **evidence:** Links to policy bundle, decision logs, recent rule diffs.
- **replay:** `scripts/predict/replay_policy.sh --policy-bundle <hash> --timestamp <iso> --horizon <1h|24h>`.
- **governance:** Audit includes policy bundle hash, rule deltas, requester role; fail closed on missing provenance.

### Ingestion Backlog Growth

- **id:** `ingestion-backlog`
- **version:** 1.0.0
- **horizons:** 1h, 24h
- **inputs:** Ingest throughput vs capacity, queue depth, parser/transform failure rates, connector health, retry storms, upstream jitter.
- **preconditions:**
  - Require connector health telemetry coverage ≥90%.
  - Deny if retry telemetry missing.
- **method:** Queue growth projection combining throughput-capacity deltas with failure-induced retry amplification; bounded to 24h.
- **outputs:** Backlog growth probability, expected queue depth, top blocking connectors, confidence band, replay token, provenance hash.
- **consumers:** Ingestion ops (automation-eligible for throttling/scheduling recommendations post-calibration).
- **controls:** Per-connector rate limits; feature flag `predictions.ingestion.enabled`; per-request compute and cost caps.
- **evidence:** Links to queue metrics, connector health dashboards, retry logs, upstream SLA signals.
- **replay:** `scripts/predict/replay_ingestion.sh --connector <id> --timestamp <iso> --horizon <1h|24h>`.
- **governance:** Audit includes connector versions, telemetry coverage, requester; fail closed on missing coverage.
