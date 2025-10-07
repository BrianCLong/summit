## Orchestrator Fast-Track Router + Green Baseline CI + Grafana Dashboard

### Summary

This PR introduces a fast-track orchestrator router behind a feature flag, a green baseline CI workflow, and Grafana dashboards for monitoring LLM costs and SLOs.

### Key Changes

1. **Feature Flagged Orchestrator** (`ORCH_FAST_TRACK`):
   - Routes to OpenAI, Anthropic, Google, Perplexity based on task requirements
   - Budget controls: per-brief and daily spending caps
   - Enabled via `ORCH_FAST_TRACK=1` environment variable (disabled by default)

2. **Green Baseline CI**:
   - Runs the golden path: `make bootstrap` → `make up` → `make smoke`
   - Ensures no regressions on every PR

3. **Grafana Dashboard**:
   - Cost per brief, P95 latency, success rate, daily cost
   - Provider mix visualization
   - Denied requests tracking

### Test Instructions

1. **Local testing** (with required API keys set):

   ```bash
   export ORCH_FAST_TRACK=1
   export ORCH_BUDGET_PER_BRIEF_USD=0.75
   export ORCH_BUDGET_DAILY_USD=30
   make bootstrap
   make up
   make smoke
   ```

2. **Verify metrics** are being emitted when the flag is enabled

### Rollback

- Set `ORCH_FAST_TRACK=0` or remove the environment variable
- No breaking changes when disabled (feature is off by default)

### Required Secrets (for enabled feature)

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `PERPLEXITY_API_KEY`
- Optional: `GRAFANA_URL`, `GRAFANA_API_TOKEN` for dashboard import

### Review Checklist

- [ ] CI green baseline passes
- [ ] Feature properly flag-gated (no changes when disabled)
- [ ] Grafana dashboard JSON is valid
- [ ] Import script functions correctly
- [ ] Configuration supports all mentioned providers
