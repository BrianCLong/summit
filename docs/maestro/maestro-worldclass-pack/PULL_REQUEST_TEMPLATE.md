## Summary

Implements initial scaffolding for world‑class upgrades:

- Portfolio Model Router (LiteLLM‑backed)
- Agent Graph Templates
- vLLM + Ray Serve inference lane
- EvalOps scorecards
- OpenTelemetry normalization
- Progressive delivery for agents/prompts

## What changed

- Adds deploy/router, deploy/observability, evals, and policies directories
- Adds GitHub Issue templates & helper scripts

## How to test

- Run `bash scripts/create_labels.sh`
- Run `bash scripts/create_issues.sh`
- Validate dashboards and telemetry once OTEL is deployed

## Risk & Mitigations

- Low risk; config-only. Follow-up PRs will enable services behind feature flags.
