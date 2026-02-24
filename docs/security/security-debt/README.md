# Security Debt Ledger Inputs

## Files
- `dependency_risk_classifications.json`: classification source for newly added dependencies.
- `threat_model_map.json`: file-pattern to threat mapping used for coverage gating.

## Update Rules
- Keep lists deterministic and sorted.
- Do not include timestamps.
- Treat unknown dependencies as gate violations in strict mode.
