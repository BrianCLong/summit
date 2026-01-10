# Agent Reality: Expectations vs Reality → Summit Patterns

This guide translates IBM’s “AI agents in 2025: expectations vs reality” lessons into concrete
patterns for Summit’s agent layer. Use it as a decision aid when designing or reviewing agent
workflows. Alignment is asserted against the Summit Readiness Assertion for auditability and
release confidence.

## Readiness alignment (Summit Readiness Assertion)

- **Authority anchor**: Align agent behavior with the readiness criteria in
  `docs/SUMMIT_READINESS_ASSERTION.md` and GA guardrails in `docs/ga/`.
- **Consistency rule**: Prefer policy-as-code for all allow/deny decisions; treat any exception as a
  **Governed Exception** with explicit policy notes and ledger annotations.
- **Evidence-first**: All claims should be backed by ledger records, policy versions, and runbook
  steps (see `RUNBOOKS/agent-ledger-debugging.md`).

## Architecture choices: orchestrator vs self-orchestrating agent

- **Use an orchestrator** when you need explicit guardrails (policy gates, HITL checkpoints),
  multi-tool sequencing, or cross-tenant isolation that must be audited step-by-step.
  Orchestrators own recovery logic, retries, and ledger emission.
- **Prefer a single self-orchestrating agent** when latency and simplicity trump composability and
  the task surface is narrow (e.g., a bounded investigative workflow with 1–2 tools). Keep scope
  tight and enforce time/tool budgets.
- **Hybrid pattern**: start with a single agent, emit an execution ledger, and promote to
  orchestrator-led when logs show repeated escalations, rollbacks, or policy/human approvals.

## Multi-agent vs single-agent ROI

- **Choose multi-agent** for role-specialized expertise (planning vs execution), heavy parallel
  tool use, or when you need independent validators (red team / reviewer agents). Only adopt
  after you have solid provenance logging and rollback across tools.
- **Choose single-agent** for early-stage features, deterministic integrations, or when operating
  in high-risk environments that require straightforward audit trails.
- **Decision rubric**: Evaluate expected value of parallelism vs orchestration overhead (latency,
  policy checks, HITL pauses). Default to single-agent until logs show sustained queueing, long
  critical paths, or repeated human approvals on the same steps.

## Agent readiness checklist

- **APIs and tool boundaries**: Every tool must declare inputs/outputs, risk level, data
  classification, idempotency, and optional rollback/compensate hooks.
- **Privacy and secrecy**: Redact credentials and sensitive payload fields before logging; label
  fields with classification tags for downstream policy filters.
- **Observability-first**: Emit an agent execution ledger record for each run (run_id, agent_id,
  tenant, goal, plan, tool calls, prompts/models, timing, retries, errors, outcome, rollback
  attempts, approvals).
- **Policy enforcement**: Route all allow/deny decisions through the policy engine (OPA/embedded
  rules). Avoid hard-coded exceptions; record Governed Exceptions when needed.
- **HITL checkpoints**: Define approval gates for high-risk tools (write/delete/exfil), boundary
  crossings (staging→prod), and low-confidence model outputs.

## Safety patterns to adopt

- **Sandbox tool calls**: Support dry-run and deny/allow lists. Simulate side effects with stubbed
  outputs before live execution.
- **Rollback-first design**: For every tool, document whether rollback is supported and what side
  effects remain if it fails. Prefer idempotent operations with idempotency keys.
- **Stress harness**: Fuzz inputs and tool outputs to probe cascading-failure paths. Couple fuzz
  runs with ledger capture to replay regressions.
- **Progressive disclosure**: Release capabilities behind feature flags and policy conditions so
  you can tighten scope quickly during incidents.

## Execution ledger data contract (minimum viable)

Store and expose a durable, append-only record of each agent run with tenant isolation:

- **Identity**: `run_id`, `agent_id`, `tenant_id`, `user_id`, `session_id`.
- **Intent**: `goal`, `plan_steps`, `requested_tools`, `risk_level`.
- **Tool calls**: `tool_name`, `inputs` (redacted), `outputs` (redacted), `latency_ms`, `status`,
  `idempotency_key`, `rollback_status`.
- **Model usage**: `model_id`, `prompt_id`, `token_counts`, `temperature`, `prompt_redaction_level`.
- **Governance**: `policy_version`, `policy_decisions`, `hitl_approvals`, `governed_exceptions`.
- **Outcome**: `final_status`, `errors`, `retries`, `compensation_results`, `completed_at`.

## Implementation sequence (atomic PRs)

1. **PR-A — Agent Execution Ledger**
   - Add durable storage, tenant-scoped query API, and redaction policy.
   - Emit ledger records from agent entry points and tool calls.
2. **PR-B — Tool Sandbox + Policy-Gated Tooling**
   - Implement dry-run sandbox, allow/deny lists, and OPA integration.
   - Add stress runner with fuzzed inputs/outputs.
3. **PR-C — Rollback / Compensating Actions**
   - Add `rollback()` hooks for tools and orchestrator rollback sequencing.
   - Record rollback attempts and outcomes in the ledger.
4. **PR-D — HITL Checkpoints + Governance Hooks**
   - Add configurable approval gates and audit trails for high-risk actions.
   - Provide default policy templates and UX guidance for approvals.

## Verification matrix (GA quality)

- **Ledger**: tool calls logged, redacted, queryable, tenant-isolated.
- **Sandbox**: disallowed tools are blocked or dry-run under policy.
- **Rollback**: compensations run on failure paths and are logged.
- **HITL**: approvals block execution until human action is recorded.

## Rollout, risk, and rollback plan

- **Rollout**: deploy behind feature flags; enable per-tenant after baseline ledger validation.
- **Risk**: policy misconfiguration or missing redaction can leak sensitive fields.
- **Rollback**: disable tool execution via policy, switch to sandbox-only, and export ledger for
  investigation. Changes to policy-as-code are reversible via versioned policy bundles.

## Documentation and runbooks

- **Debug & replay**: Use the agent execution ledger to inspect prompts, tool calls, approvals,
  rollbacks, and errors. Provide a CLI/UI query path for rapid triage.
- **Incident response**: When a step fails, trigger compensating actions where supported, alert
  human approvers, and freeze risky tools via policy changes.
- **Audit export**: Produce tenant-scoped, redacted exports from the ledger for compliance reviews.
  Ensure secrets remain redacted at rest and in transit.

## Alignment notes (paper trail)

- **Authority files**: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`,
  `docs/governance/META_GOVERNANCE.md`, `docs/ga/TESTING-STRATEGY.md`.
- **Operational guidance**: `RUNBOOKS/agent-ledger-debugging.md`.

## Upgrade path for Summit

1. **Land the Agent Execution Ledger** (durable, redacted, tenant-scoped). Expose replay/query APIs.
2. **Add sandbox + policy gating** for tools, with allow/deny lists and dry-run shims.
3. **Layer rollback orchestration** with idempotency keys and compensating actions.
4. **Introduce HITL checkpoints** for high-risk operations and low-confidence branches.
5. **Continuously fuzz** tool inputs/outputs to validate policies, sandboxing, and rollback under
   stress.

These steps keep the platform aligned with enterprise guidance while preserving flexibility between
orchestrated and self-orchestrating agents.
