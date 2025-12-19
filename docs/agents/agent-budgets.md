# Agent Budget Manifests

Agent budgets keep autonomous workloads bounded with deterministic, reviewable controls. Each agent must ship with a budget manifest that is validated in CI before other checks run.

## Goals

- Deterministic resource ceilings (no burst billing, no external metering).
- Clear ownership and review signals for each agent.
- Enforceability: manifests are schema-validated and must exist for every agent directory.
- Auditability: validation emits audit stubs for downstream telemetry.

## Manifest layout

Budget manifests live under `agents/budgets/<agent>.budget.json` and follow the JSON Schema defined in `schemas/agent-budget-manifest.schema.json`.

### Required fields

| Field | Purpose |
| --- | --- |
| `$schema` | Locks the manifest to the repository-hosted schema URI. |
| `schemaVersion` | Date-stamped version string (`YYYY-MM-DD`) for change control. |
| `agentId` | Matches the agent directory name (e.g., `codex`). |
| `owner` | Accountable owner or team for risk acceptance. |
| `description` | Operational summary for reviewers. |
| `deterministicLimits` | Hard ceilings for tokens, calls, runtime, concurrency, network. |
| `risk` | Inherent, controlled, and residual risk plus the risk ceiling. |
| `telemetry.auditLogPath` | Where audit entries are written (local, deterministic path). |

### Deterministic limits

`deterministicLimits` are enforced as fixed integers. They must not depend on external billing or dynamic pricing signals. Required keys:

- `maxTokens`: Maximum tokens per run.
- `maxCallsPerRun`: LLM/tool calls allowed per run.
- `maxWallClockMs`: Runtime ceiling per run.
- `maxConcurrentRuns`: Max simultaneous executions.
- `maxDailyRuns`: Daily execution ceiling.
- `maxNetworkKB`: Allowed network egress per run.

### Risk block thresholds

Risk metadata declares how much change risk the agent can tolerate:

- `risk.inherent`, `risk.controlBaseline`, and `risk.residual` are 0–10 integers.
- `risk.riskTier` is one of `low`, `medium`, `high`, `critical`.
- `risk.riskCeiling` is the maximum residual risk tolerated for merges. CI fails if residual exceeds this value or if the PR-level risk gate decides the change is high/critical.

## CI enforcement

- **Manifest existence**: CI fails if any agent directory lacks a corresponding manifest.
- **Schema validation**: `scripts/validate-agent-budgets.js` validates manifests against `schemas/agent-budget-manifest.schema.json` and ensures deterministic-only limits.
- **Risk gate**: `scripts/enforce-pr-risk.js` blocks PRs whose aggregated risk exceeds the configured ceiling (defaults: block `critical`, score > 8).

## Audit & telemetry

`agents/audit/logStub.js` provides a deterministic audit stub that writes JSONL records to `agents/audit/logs/agent-audit.log`. Validation scripts record successes and failures so downstream observability systems can forward or transform the log without external billing hooks.
