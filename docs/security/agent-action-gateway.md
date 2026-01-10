# Agent Action Gateway

The Agent Action Gateway is the chokepoint for **all Agent Lab tool executions**, enforcing Menlo-aligned controls across Access/Auth, Run, and Observe/Govern.

## Responsibilities

- Build a principal chain for each action (human → agent → runtime → request IDs).
- Enforce allow/deny lists, target allowlists, environment restrictions, and rate limits before any tool is invoked.
- Honor a kill-switch flag (`AGENT_ACTIONS_DISABLED=1` with optional `AGENT_ACTIONS_DISABLED_REASON`).
- Bound data egress via output length checks and `ContentBoundary` redaction.
- Emit structured audit events (`audit/events.ndjson`) and evidence artifacts per action.
- Persist redacted inputs/outputs in evidence artifacts (raw output files store bounded, sanitized content).

## Configuration knobs

- **Allowlist / denylist**: `policy.allowedTools`, `policy.denylist` (workflow), plus `environmentRestrictions`.
- **Attribution mode**: `policy.attributionMode` (`lenient` | `strict`, default strict) and `policy.requireHuman`.
- **Rate limit**: `policy.rateLimit` `{ maxCalls, intervalMs }`.
- **Data egress**: `policy.dataEgress.maxOutputLength` (default 2000) and automatic secret/injection redaction.
- **Kill switch**: environment variable, logged with audit events when tripped.

## Audit event shape

Events are stored at `artifacts/runs/<runId>/audit/events.ndjson` and include:

- `event_type`: attempt | decision | result
- `principal_chain`: human/agent/runtime/request metadata
- `action`: tool, action name, target
- `policy_decision`: allow/deny reason, policy version, enforced rules, attribution/kill-switch flags
- `result`: status, failure_class, message, output_hash, redactions
- `latency_ms`, `correlation_id`, `inputs_fingerprint`

## Operator guidance

- **Investigate denials**: search `failure_class` for `attribution`, `policy-deny`, `kill-switch`, or `egress` to understand gate activation.
- **Adjust policy**: update workflow policy blocks or ToolBus config for allow/deny lists and rate limits. Changes are versioned via run evidence.
- **Break glass**: set `AGENT_ACTIONS_DISABLED=1` with a reason, then confirm via audit events before re-enabling.

## Evidence linkage

- Implementation: `packages/agent-lab/src/agentActionGateway.ts`, `packages/agent-lab/src/audit.ts`, `packages/agent-lab/src/policy.ts`, `packages/agent-lab/src/evidence.ts`, `packages/agent-lab/src/toolBus.ts`.
- Tests: `packages/agent-lab/__tests__/agent-action-gateway.test.ts`.
- Design: `docs/adr/ADR-011-agent-action-gateway.md`, `docs/research/menlo-agents-security/*`.
