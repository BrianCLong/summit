# ADR-011: Agent Action Gateway as a Single Chokepoint

## Status

Proposed

## Context / Problem Statement

Agent tool executions currently occur directly through the Agent Lab ToolBus with limited policy checks and no unified place to enforce identity attribution, kill-switch controls, or structured audit. Menlo's Security for Agents thesis requires an authoritative chokepoint for Access/Auth, Run, and Observe/Govern phases to mitigate non-deterministic agent behavior and tool chaining risk.

## Decision

Introduce an **Agent Action Gateway** inside the Agent Lab runtime that wraps every tool invocation. The gateway collects a principal chain, enforces allow/deny lists and attribution strictness, consults the policy engine for rate/target/tool checks, honors a kill-switch flag, bounds data egress, and emits structured audit/provenance events before and after execution. ToolBus will route all tool calls through this gateway.

## Enforcement Points

- **Admission**: validate principal chain completeness (human, agent, runtime, trace IDs) per strictness mode; enforce kill-switch before executing.
- **Policy**: evaluate allowlist/denylist, target allowlist, command allowlist, rate limit, and environment-restricted tools via the policy engine.
- **Egress**: enforce output length caps and redaction using `ContentBoundary` prior to persistence.
- **Decision Logging**: emit attempt/decision/result events with timestamps, latency, failure classification, and applied policy version.

## Policy Model

- **Allow/Deny**: explicit allowlist of tools; optional denylist and environment-restricted tools.
- **Attribution Requirements**: configurable `lenient` vs `strict` (strict denies missing human/agent/runtime/trace data).
- **Safety Constraints**: rate limit (calls per window), output size cap, and disabled-tool lists.
- **Conditional Hooks**: policy engine remains pluggable (`PolicyEngine`), enabling future external PDPs; rationale recorded in decisions.

## Audit/Provenance Schema

Audit events (NDJSON) include:

- `event_type`: attempt | decision | result
- `timestamp` and `latency_ms`
- `principal_chain`: human, agent, runtime, request/trace identifiers
- `action`: tool name, action type, target/resource
- `policy_decision`: allowed flag, reason, policy version, enforcement list
- `result`: status (allowed/denied/error/kill-switch), redactions, output hash, failure classification
- `correlation_id`: stable per step/run for querying

## Alternatives Considered

- **Per-tool inline checks**: rejected; duplicates logic and cannot guarantee consistent attribution or observability.
- **External service-only gateway**: deferred; adds network hops and deployment complexity. Starting in-process keeps the choke point close to execution while preserving future externalization.

## Security & Operational Implications

- Centralized guardrail improves auditability and provides a fast kill-switch.
- Safe-by-default configuration may deny unknown tools; operators can relax via config.
- Gateway emits structured logs to support compliance mappings and incident response.
- Future work: align Workcell runtime with the gateway pattern to avoid divergent controls.
