# ORCH_FAST_TRACK Feature Flag

## Description

The `ORCH_FAST_TRACK` feature flag enables the fast-track LLM orchestrator that routes requests to different providers based on task requirements. When disabled (default), the orchestrator uses the standard routing.

## Toggle Instructions

### Enable the feature:

```bash
export ORCH_FAST_TRACK=1
export ORCH_BUDGET_PER_BRIEF_USD=0.75
export ORCH_BUDGET_DAILY_USD=30
```

### Disable the feature (default):

```bash
export ORCH_FAST_TRACK=0
# OR Remove the environment variables entirely
unset ORCH_FAST_TRACK
```

## Configuration Options

- `ORCH_BUDGET_PER_BRIEF_USD`: Maximum cost per brief (default: 0.75)
- `ORCH_BUDGET_DAILY_USD`: Maximum daily cost (default: 30)

## Rollback Instructions

To rollback:

1. Set `ORCH_FAST_TRACK=0` or remove the environment variable
2. Restart services
3. Verify that traffic flows through the original router

## Required Secrets (when enabled)

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `PERPLEXITY_API_KEY`

## Monitoring

When enabled, the orchestrator emits these metrics:

- `orchestrator_requests_total`
- `orchestrator_latency_seconds_*`
- `orchestrator_cost_usd_total`
- `orchestrator_denied_total`
- `orchestrator_provider_requests_total`

View these metrics on the "LLM Orchestrator Cost & SLOs" dashboard.
