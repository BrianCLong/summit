# AI Supply Chain Firewall Performance Budgets

These performance constraints are enforced by CI.

## Budgets

* **Per-PR analysis time:** < 15s
* **Memory footprint:** < 250MB
* **Network:** No network in CI by default (optional "enriched mode" behind a feature flag).

## Profiling

Use `scripts/profile_ai_supply_chain_firewall.py` to generate `evidence/ai-supply-chain-firewall/perf.json`.
