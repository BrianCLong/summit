# Agent Reality: Expectations vs Reality → Summit Patterns

This guide translates IBM's "AI agents in 2025: expectations vs reality" lessons into concrete patterns for Summit's agent layer. Use it as a decision aid when designing or reviewing agent workflows.

## Architecture choices: orchestrator vs self-orchestrating agent

- **Use an orchestrator** when you need explicit guardrails (policy gates, HITL checkpoints), multi-tool sequencing, or cross-tenant isolation that must be audited step-by-step. Orchestrators own recovery logic, retries, and ledger emission.
- **Prefer a single self-orchestrating agent** when latency and simplicity trump composability and the task surface is narrow (e.g., a bounded investigative workflow with 1–2 tools). Keep scope tight and enforce time/tool budgets.
- **Hybrid pattern**: start with a single agent, emit an execution ledger, and promote to orchestrator-led when logs show repeated escalations, rollbacks, or policy/human approvals.

## Multi-agent vs single-agent ROI

- **Choose multi-agent** for role-specialized expertise (planning vs execution), heavy parallel tool use, or when you need independent validators (red team / reviewer agents). Only adopt after you have solid provenance logging and rollback across tools.
- **Choose single-agent** for early-stage features, deterministic integrations, or when operating in high-risk environments that require straightforward audit trails.
- **Decision rubric**: Evaluate expected value of parallelism vs orchestration overhead (latency, policy checks, HITL pauses). Default to single-agent until logs show sustained queueing, long critical paths, or repeated human approvals on the same steps.

## Agent readiness checklist

- **APIs and tool boundaries**: Every tool must declare inputs/outputs, risk level, data classification, idempotency, and optional rollback/compensate hooks.
- **Privacy and secrecy**: Redact credentials and sensitive payload fields before logging; label fields with classification tags for downstream policy filters.
- **Observability-first**: Emit an agent execution ledger record for each run (run_id, agent_id, tenant, goal, plan, tool calls, prompts/models, timing, retries, errors, outcome, rollback attempts, approvals).
- **Policy enforcement**: Route all allow/deny decisions through the policy engine (OPA/embedded rules). Avoid hard-coded exceptions.
- **HITL checkpoints**: Define approval gates for high-risk tools (write/delete/exfil), boundary crossings (staging→prod), and low-confidence model outputs.

## Safety patterns to adopt

- **Sandbox tool calls**: Support dry-run and deny/allow lists. Simulate side effects with stubbed outputs before live execution.
- **Rollback-first design**: For every tool, document whether rollback is supported and what side effects remain if it fails. Prefer idempotent operations with idempotency keys.
- **Stress harness**: Fuzz inputs and tool outputs to probe cascading-failure paths. Couple fuzz runs with ledger capture to replay regressions.
- **Progressive disclosure**: Release capabilities behind feature flags and policy conditions so you can tighten scope quickly during incidents.

## Documentation and runbooks

- **Debug & replay**: Use the agent execution ledger to inspect prompts, tool calls, approvals, rollbacks, and errors. Provide a CLI/UI query path for rapid triage.
- **Incident response**: When a step fails, trigger compensating actions where supported, alert human approvers, and freeze risky tools via policy changes.
- **Audit export**: Produce tenant-scoped, redacted exports from the ledger for compliance reviews. Ensure secrets remain redacted at rest and in transit.

## Upgrade path for Summit

1. **Land the Agent Execution Ledger** (durable, redacted, tenant-scoped). Expose replay/query APIs.
2. **Add sandbox + policy gating** for tools, with allow/deny lists and dry-run shims.
3. **Layer rollback orchestration** with idempotency keys and compensating actions.
4. **Introduce HITL checkpoints** for high-risk operations and low-confidence branches.
5. **Continuously fuzz** tool inputs/outputs to validate policies, sandboxing, and rollback under stress.

These steps keep the platform aligned with IBM's enterprise guidance while preserving flexibility between orchestrated and self-orchestrating agents.
