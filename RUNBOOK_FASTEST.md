# Copilot Multi-LLM Routing (FASTEST)

## Goal
Enable feature-flagged multi-provider routing for Copilot while enforcing policy, spend controls, and provenance.

## Enable
```
make staging-on
```

## Disable / Rollback
```
make staging-off
```

## Required Migrations
1. Postgres ledger: `make migrate-db`
2. Neo4j models: `make seed-neo4j`

## Monitoring
- Grafana dashboard: **Copilot Routing** (`infra/grafana/copilot_dashboard.json`)
  - Cost per minute (USD)
  - p95 latency (provider split)
  - OPA denials by reason
  - Route mix by provider
- Prometheus metrics prefixed `intelgraph_llm_*`

## Budgets & Caps
- Per-brief cap: `$PER_BRIEF_CAP_USD` (default $2.50) – router downshifts before exceeding
- Provider budgets:
  - OpenAI `${OPENAI_BUDGET_USD}`
  - Anthropic `${ANTHROPIC_BUDGET_USD}`
  - Perplexity `${PERPLEXITY_BUDGET_USD}`
  - Google `${GOOGLE_BUDGET_USD}`

## Policy
- OPA `intelgraph/llm/route` ensures TS traffic stays on US providers and citations use Perplexity
- OPA `intelgraph/llm/output` redacts search answers without citations
- TS classification always fail-closed; U-classification fail-open if OPA unavailable

## Self-Healing Loop
1. Workflow failure triggers `.github/workflows/self-heal.yml`
2. `scripts/ci/summarize_failure.py` builds JSON summary via GitHub API
3. `scripts/ci/self_heal.py` asks router for fix proposal
4. Bot opens PR with plan for human review

## Observability Hooks
- `scripts/ops/import_grafana_dashboard.sh` auto-imports dashboard post-deploy
- Neo4j provenance nodes via `writeProvenance`
- Postgres `llm_calls` table for spend audits

## Support Contacts
- Feature owners: Copilot platform team
- Policy owner: Trust & Safety
- FinOps owner: Cost governance
