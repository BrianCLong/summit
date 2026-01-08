# Defensive Publication: Federated Query DP Budget Allocation Heuristics

- **Timestamp (UTC):** 2025-12-19T19:24:20Z
- **Venue:** Summit defensive publication archive (public repo) and derivative export feed
- **Scope:** Differential privacy (DP) budget handling inside the federated query stack that spans PostgreSQL, Neo4j, and cached feature stores
- **Status:** Disclosed for prior art; implements production heuristics with renewal cadences and sensitivity tiers

## Context

The federated query stack accepts multi-hop graph queries that fan out across relational, graph, and cache layers. Each query is wrapped in a DP envelope that enforces per-subject epsilon (ϵ) and delta (δ) budgets while allowing analysts to chain joins and sub-queries. Workloads are stratified by sensitivity tier, so high-risk entities (e.g., classified or regulated) consume DP budget faster and renew more slowly.

## Sensitivity Tiers and Baseline Weights

| Tier | Description                    | Weight `w_t` | Default renewal window | Notes                             |
| ---- | ------------------------------ | ------------ | ---------------------- | --------------------------------- |
| T0   | Public/unclassified            | 0.25         | 6 hours                | auto-refresh, full carry-over     |
| T1   | Internal/low-risk PII          | 0.5          | 12 hours               | 80% carry-over cap                |
| T2   | Regulated data (HIPAA/PCI)     | 1.0          | 24 hours               | 50% carry-over cap                |
| T3   | Mission-critical/compartmented | 2.0          | 72 hours               | no carry-over; manual top-up only |

Tier weights scale the instantaneous spend rate. Renewals apply at different cadences to bound exposure.

## Budget Minting Formula

Per subject `s` and tier `t`, the minted budget for window `k` is:

```
B_{s,t,k} = clamp(min_budget, base_budget * f_load(k) * f_risk(s,t), max_budget)
```

- `base_budget` defaults to ϵ=1.0, δ=1e-6.
- `f_load(k) = 1 / (1 + λ * qps_k)` throttles during high QPS windows (λ≈0.15).
- `f_risk(s,t) = w_t * (1 + tag_penalty_s)` where `tag_penalty` is 0 for T0-T1, +0.5 for T2, +1.0 for T3 when `needs-human-review` tag is present.
- `clamp` enforces `[0.1, 2.5]` for ϵ and `[1e-8, 1e-5]` for δ.

Carry-over is applied as `B' = min(B + carry * carry_cap_t, carry_cap_t)` where `carry_cap_t` is the tier-specific cap from the table above.

## Spend Heuristic per Query Plan

Each logical plan is decomposed into nodes (scan, join, aggregate). Spend is allocated per node and summed, with a post-plan safety margin.

```
for node in plan:
  sens = node.sensitivity  # derived from column policy + data class tags
  tier = map_to_tier(sens)
  local_eps = base_eps_node * w_tier[tier] * noise_multiplier(node.shape)
  local_delta = base_delta_node * w_tier[tier]
  debit(subject, tier, local_eps, local_delta)

# Safety margin
margin = 0.1 * total_eps
if remaining_eps < margin:
  reject(plan, reason="insufficient DP budget safety margin")
```

`noise_multiplier` grows logarithmically with output dimensionality: `1 + ln(cols + joins)` to discourage wide reveals.

## Renewal Cadence and Decay

Budgets decay continuously inside each window to prevent burst abuse:

```
remaining_eps(t) = B * exp(-decay_rate_t * t)
```

- `decay_rate_t` per tier: T0=0.05/hr, T1=0.075/hr, T2=0.1/hr, T3=0.15/hr.
- At renewal boundaries, budgets are re-minted via `B_{s,t,k}`; T3 requires manual approval token.

## Multi-tenant Fairness Guard

A per-tenant throttle enforces `Σ_subjects B_{s,t,k} <= tenant_cap_t` where `tenant_cap_t = tenant_base * w_t`. Overruns trigger backoff and alerting to the governance service. This prevents a noisy tenant from exhausting cluster-level privacy reserves.

## Federated Join Special Case

For joins that bridge graph and relational stores, the orchestrator computes a joint sensitivity score `S_joint = max(S_rel, S_graph) + cross_domain_penalty`. If `S_joint` maps to a higher tier than either side, the higher tier governs the entire query. The allocated budget is then `local_eps *= 1.2` to account for compounded leakage risk, and results are truncated to top-K with Gaussian noise calibrated to the elevated ϵ.

## Audit and Provenance

Every debit event writes `{subject, tier, eps, delta, plan_id, node_path, remaining_after}` to the provenance ledger. Ledger entries are linked to analyst IDs and preserved for 400 days to establish lineage for compliance and to evidence this defensive disclosure.

## Prior Art Claim

This publication discloses concrete heuristics (tier-weighted spend, QPS-aware minting, exponential decay, cross-domain escalation, and margin-based rejection) sufficient for reproduction. It is archived with immutable timestamps to serve as defensive prior art against substantially similar DP budget allocation schemes in federated query engines.
