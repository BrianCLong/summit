# Defensive Publication: Federated DP Budget Allocation Heuristics

- **Timestamp (UTC):** 2025-12-19T19:40:20Z
- **Intended venue:** IP.com defensive publication (or equivalent public prior-art repository). Export bundle prepared for submission; upload action required by release manager because external network is restricted in this environment.
- **Scope:** IntelGraph federated query stack — adaptive ε/δ budgeting, cross-tenant throttles, and renewal cadence for differential privacy (DP) noise injection.

## Problem Context

Federated queries span multiple data custodians with heterogeneous sensitivity (PII, OSINT, HUMINT, telemetry). A single ε/δ pair is either too lax (over-exposes high-tier data) or too strict (makes low-tier results unusable). The stack needs a deterministic yet tunable heuristic that (1) assigns per-query DP budgets from tiers, (2) consumes from a ledger shared across query engines, and (3) renews budgets on a predictable cadence to keep throughput high without privacy regression.

## Data Model

- **Sensitivity tiers:** `Tier0 (public)`, `Tier1 (low-PII)`, `Tier2 (moderate-PII)`, `Tier3 (sensitive identifiers)`, `Tier4 (special category/biometric)`. Each tier has a base epsilon `ε_base[tier]` and delta `δ_base[tier]` (e.g., Tier1: ε=2.0, δ=1e-6; Tier4: ε=0.2, δ=1e-9).
- **Ledger key:** `(tenant_id, data_domain, tier)` → record `{remaining_epsilon, remaining_delta, window_start, window_end}`.
- **Query features:** `join_count`, `aggregation_depth`, `time_range_days`, `contains_location`, `contains_biometrics`, `contains_free_text`, `audience` (internal/partner/public).
- **Multipliers:**
  - **Structure multiplier:** `m_struct = 1 + 0.1 * join_count + 0.05 * aggregation_depth`.
  - **Content multiplier:** `m_content = 1.5` if `contains_biometrics`, `1.2` if `contains_location`, `1.1` if `contains_free_text`, else `1.0`.
  - **Audience multiplier:** `m_audience = 1.3` for partner-facing, `1.6` for public, `1.0` for internal.

## Allocation Heuristic

1. **Tier selection:** Evaluate query fields against data catalog labels. Highest tier present controls the baseline.
2. **Budget sizing:**
   - `ε_req = ε_base[tier] / (m_struct * m_content * m_audience)` (bounded below by `ε_min[tier]`).
   - `δ_req = δ_base[tier] * (m_struct * m_content)`, capped at `δ_max[tier]`.
3. **Cross-engine arbitration:** When a query fan-outs to multiple engines, compute `ε_req_engine[i] = ε_req * weight[i]`, where `weight[i] = rows_estimated[i] / Σ rows_estimated`. Apply the same for δ.
4. **Ledger check & reservation:** Atomically compare-and-reserve against `(tenant_id, data_domain, tier)` ledger. If insufficient, downgrade to more noisy response or require re-authorization.
5. **Noise configuration:**
   - Count queries: Laplace(0, 1/ε_req_engine[i]).
   - Sums/means: Gaussian(σ^2 = 2 \* ln(1.25/δ_req_engine[i]) / ε_req_engine[i]^2).
   - Heavy joins: enforce contribution bounding `k` with clipping; adjust ε by dividing by `k`.
6. **Attribution:** Log `{query_id, ε_req, δ_req, tier, ledger_key, m_struct, m_content, m_audience, renewal_window}` to the provenance bus for audit replay.

### Pseudocode

```
def allocate_budget(query, tenant_id):
    tier = max_tier(query.labels)
    m_struct = 1 + 0.1 * query.join_count + 0.05 * query.aggregation_depth
    m_content = 1.5 if query.contains_biometrics else 1.2 if query.contains_location else 1.1 if query.contains_free_text else 1.0
    m_audience = {"internal": 1.0, "partner": 1.3, "public": 1.6}[query.audience]

    eps_base, delta_base = EPS_BASE[tier], DELTA_BASE[tier]
    eps_req = max(EPS_MIN[tier], eps_base / (m_struct * m_content * m_audience))
    delta_req = min(DELTA_MAX[tier], delta_base * (m_struct * m_content))

    weights = estimate_engine_weights(query.execution_plan)
    eps_per_engine = {e: eps_req * w for e, w in weights.items()}
    delta_per_engine = {e: delta_req * w for e, w in weights.items()}

    ledger_key = (tenant_id, query.domain, tier)
    if not ledger.reserve(ledger_key, eps_req, delta_req):
        return INSufficientBudget

    return NoiseConfig(eps_per_engine, delta_per_engine, tier=tier, renewal=ledger.window(ledger_key))
```

## Renewal Cadence

- **Windowing:** Rolling 30-day window keyed by tenant and tier; daily micro-buckets to smooth consumption.
- **Top-off rule:** If remaining_epsilon < 20% of baseline before day 25, auto-provision a soft top-off of 10% after peer-review from privacy officer (recorded in ledger with `approval_ref`).
- **Decay:** Unused epsilon does not roll over; delta budgets fully reset at window boundaries.
- **Burst buckets:** Per-incident temporary burst (`+15% ε`) allowed for incident response with mandatory post-hoc review.

## Safety & Auditability

- **Deterministic classifiers:** Tier mapping uses canonical labels to prevent privilege creep.
- **Join hard cap:** Reject queries with `join_count > 6` for Tier3+ unless explicit approval.
- **Shadow evaluation:** For each allocation, simulate `ε_req` under worst-case multipliers; if deviation >15%, emit alert.
- **Provenance:** Ledger and allocation events streamed to `prov-ledger` topic with hash chains anchored daily.

## Interoperability

- Compatible with per-service DP wrappers by consuming `NoiseConfig` over gRPC/HTTP.
- Supports federated analytics engines (Presto/Trino, Spark, in-house graph executor) by normalizing `ε` and `δ` per engine weight.

## Publication & Prior-Art Positioning

- This document is structured for defensive publication to establish prior art on DP budget allocation heuristics with tiered sensitivity, multiplier-based scaling, cross-engine weighting, and rolling renewal cadences.
- External upload is required to complete publication; the included metadata and algorithmic detail are sufficient for venue submission without additional proprietary context.
