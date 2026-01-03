# Orchestration Control Plane

This slice aligns the Summit stack to Deloitte's recommended context/agent/experience model while staying additive and policy-driven.

## Architecture Layers

- **Context layer**: context shaping takes retrieved evidence, deduplicates, ranks, trims to a token budget, and carries provenance/conflict markers into every LLM step.
- **Agent layer**: the `packages/orchestration` runtime plans DAGs, executes sequential/parallel fan-out and joins, and runs guardian checks via a policy decision provider. Telemetry is emitted via OTEL spans for planning, execution, and each step.
- **Experience layer**: `/orchestration/runs/:id` in the web app visualizes plans, step statuses, approvals, and key metadata with approve controls for HITL.

## Autonomy spectrum

Runtime supports three policy-set modes: `HITL` (approve steps), `HOTL` (monitor + intervene), and `HOOTL` (monitor-only). Guardian decisions can downgrade autonomy, block, or require human approval.

## Protocol adapters

A protocol abstraction keeps room for A2A/AGNTCY/MCP. The first adapter is a `LocalAdapter` for Summit-internal agents; more can be added behind feature flags without touching plans.

## Run traces & provenance

Each execution captures a run trace with plan snapshot, step statuses, approvals, policy decisions, and provenance IDs from shaped context.

## APIs

- `POST /api/orchestration/plan` — generate a policy-aware plan + shaped context
- `POST /api/orchestration/runs` — execute a provided plan under a chosen autonomy mode
- `GET /api/orchestration/runs/:id` — fetch run trace
- `POST /api/orchestration/runs/:id/approve` — approve a pending step in HITL

Authentication follows existing API middleware.

## Tests and harness

Unit tests cover planning, fan-out/join execution, guardian decisions (block/require approval), and context shaping. Adversarial scenarios are expressed as guardian policies that block or gate unsafe transforms.

## How to run

```bash
pnpm test --filter @intelgraph/orchestration
pnpm --filter @intelgraph/web test # optional UI checks
```

## Human oversight

Guardian hooks surface decisions into traces and the UI, making human-on-the-loop viable with OTEL telemetry for traceability.
