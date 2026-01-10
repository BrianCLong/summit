# Repository Grounding: Agent Execution & Security Controls

## Where agent or tool actions execute today

- **Agent Lab runtime (packages/agent-lab/src/toolBus.ts, tools.ts, workflowSpec.ts)**: A workflow-driven tool bus registers tool definitions and executes them step-by-step, constructing inputs per step and invoking `ToolDefinition.execute`. This is the primary side-effecting path (HTTP/DNS/local file reads) used by the lab CLI.
- **Workcell runtime (ga-graphai/packages/workcell-runtime/src/index.ts)**: Executes work orders by routing tasks to registered agents/tools with policy evaluations and provenance ledger writes. Focused on graph-ai stack; currently not wired into Agent Lab flows.

## Existing enforcement/guardrails

- **Allowlist + target checks (packages/agent-lab/src/policy.ts)**: `BasicPolicyEngine` enforces allowed tools, command allowlists, target allowlists (hostname matching), and an optional rate limit window.
- **Content boundary and redaction (packages/agent-lab/src/contentBoundary.ts)**: Sanitizes outputs for evidence, redacting secret-like tokens and injection phrases and bounding length.
- **Evidence and provenance (packages/agent-lab/src/evidence.ts)**: Every tool execution is written to an append-only NDJSON ledger with hashes, timestamps, and policy decisions; also emits run summaries/reports.
- **Workcell policy + ledger (ga-graphai/packages/workcell-runtime/src/index.ts)**: Each task evaluation runs through a policy engine and appends to a `ProvenanceLedger` with task status and obligations.

## Gaps observed

- **No unified action gateway**: ToolBus calls tools directly after a single policy check; there is no chokepoint that ties identity, kill-switch, and audit together for every call.
- **Attribution is implicit**: Evidence artifacts lack principal chains (human initiator, agent identity, runtime/session, trace IDs), making provenance incomplete for governance controls.
- **Kill switch absent**: No runtime flag to globally disable agent actions with audit logging for break-glass scenarios.
- **Policy coverage limits**: BasicPolicyEngine lacks denylist handling, attribution requirements, and output-bound enforcement; observability does not emit structured audit events separate from evidence files.

## Scope for this slice

- Implement a **Tool/Agent Action Gateway** inside Agent Lab to serve as the single chokepoint for tool executions, adding identity attribution, richer policy enforcement (allow/deny lists, attribution strictness, output bounds), rate limiting, and kill-switch integration.
- Preserve existing Workcell runtime behavior and document follow-up alignment; current changes focus on the Agent Lab execution path to avoid destabilizing unrelated stacks.
