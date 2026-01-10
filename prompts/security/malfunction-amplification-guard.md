# Summit — Malfunction Amplification Guardrails & Red-Team Harness

**Objective:** Implement runtime guardrails and regression harnesses that detect and halt malfunction amplification attacks against autonomous agents, while preserving normal task execution.

## Core Requirements

- Add runtime guardrails for repetition loops, semantic near-duplicate actions, no-progress windows, and tool-call budgets.
- Emit structured guard incidents and require replanning when guardrails trigger.
- Perform dual self-checks for policy-violation intent and malfunction intent on guard triggers or inbound instruction payloads.
- Record guard incidents and self-checks in provenance logs.
- Provide a red-team regression harness that injects loop and irrelevant-tool instructions to measure failure rates.
- Document the threat model and runbook in SECURITY.md.

## Scope

- Workcell runtime guardrails and logging.
- Shared types for guard incidents and self-check results.
- Gateway GraphQL exposure for guard incidents/self-checks.
- CI workflow for red-team regression.

## Guardrails

- Preserve existing behavior for normal tasks.
- Provide configuration knobs with safe defaults.
- Ensure all changes are tested and documented.

## Acceptance Criteria

- Guardrails halt execution on repeated or no-progress patterns and log incidents.
- Self-check results are recorded when instructions are observed or guards trigger.
- Red-team harness passes and enforces a failure-rate regression budget.
- Documentation includes threat model and runbook steps.
