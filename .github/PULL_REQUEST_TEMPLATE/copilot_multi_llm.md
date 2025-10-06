# IntelGraph: Copilot Multi-LLM Routing (FASTEST → BEST)

## Summary
This PR enables **feature-flagged** multi-LLM routing inside Copilot to accelerate build/self-healing across IntelGraph, Maestro Conductor, CompanyOS, and Switchboard. It adds adapters, OPA gates, Neo4j provenance, cost logging, budgets, and Grafana panels. Flag off = no change.

## Feature Flag
- `COPILOT_MULTI_LLM` default `false`
- Rollback: `kubectl set env deploy/copilot COPILOT_MULTI_LLM=false -n <env>`

## Budgets & Caps
- Per-brief cap `${PER_BRIEF_CAP_USD:-2.50}`
- Provider budgets `OPENAI_BUDGET_USD`, `ANTHROPIC_BUDGET_USD`, `PERPLEXITY_BUDGET_USD`, `GOOGLE_BUDGET_USD`

## SLOs
- p95 latency `< 8s`
- Error rate `< 1%` (excluding policy denials)

## Security & Policy
- OPA pre-route (`intelgraph/llm/route`)
- OPA post-output (`intelgraph/llm/output`)
- Fail-closed for TS, U-only fail-open on OPA outage

## Provenance & Costing
- Neo4j `(:Provenance)` nodes, linked to `(:Model)` & `(:Investigation)`
- Postgres `llm_calls` ledger for audits
- Response metadata surfaces provider/model/tokens/cost/latency

## Testing & Pilot
- Unit tests for routing heuristics + policy guardrails
- Integration: provenance write & feature flag toggles
- Staging pilot: 3–5 analysts for 3–5 days

## Rollback
- Disable flag (`COPILOT_MULTI_LLM=false`)
- OPA outage: set `OPA_ENFORCE=false` for U-only traffic; TS stays fail-closed

## Acceptance Criteria
- [ ] Flag off = baseline behavior
- [ ] Flag on = 100% provenance coverage
- [ ] p95 < 8s (staging synthetic)
- [ ] Median cost/brief ≤ $2.00 (cap $2.50)
- [ ] Grafana dashboard populated post-deploy

## Linked Work
- BEST sprint follow-up: deep provenance UI, expanded OPA, DLQ/retries, learned routing
