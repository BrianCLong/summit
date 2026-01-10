# Savings Ledger

Tracks realized cost savings with attribution, durability, and evidence. Values reflect monthly run-rate unless noted.

| Date       | Source                      | Amount (USD) | Confidence | Durability                | Evidence                          | Owner          |
| ---------- | --------------------------- | ------------ | ---------- | ------------------------- | --------------------------------- | -------------- |
| 2025-12-31 | Prompt compaction + caching | 2,100        | High       | Durable (feature-flagged) | `artifacts/cost_perf/latest.json` | LLM Efficiency |

## Reporting Rules

- Each entry must cite before/after metrics and link to PR(s) with guardrail evidence.
- Confidence levels: Low (<50% reproducibility), Medium (50-80%), High (>80%).
- Durability: one-time vs run-rate vs durable (protected by guardrails/flags).

## Reconciliation

- Reconcile ledger monthly with Finance partner; net savings must match platform invoice deltas.
- Negative savings (regressions) must be recorded with remediation plans.
