# Summit — Prompt N+4: Agent-Native Development Loop

**Objective:** Implement a closed-loop, agent-native development system in which each task is defined by an immutable prompt, validated entirely by CI, deterministically merged, and archived with full provenance.

## Core Requirements

- All work begins from a versioned, content-addressed prompt.
- Each task declares explicit scope, allowed operations, success criteria, and stop conditions.
- PRs must provide machine-parseable metadata linking the agent, task, prompt hash, domains, verification tier, and debt delta.
- CI enforces prompt integrity, scope adherence, verification tiers, debt budgets, and policy compliance.
- Successful runs auto-generate artifacts: execution record, metrics, and archives for prompts, specs, and CI outputs.
- Failures emit structured artifacts with classification and remediation guidance.

## Deliverables

1. Canonical Agent Task Spec (ATS) schema and examples.
2. Prompt registry that enforces immutability through hashes and scope mapping.
3. PR template and validators that treat PRs as execution artifacts.
4. Deterministic merge flow that emits task completion archives.
5. Failure-mode taxonomy and remediation requirements.
6. Metrics schema and CI artifact for agent throughput and safety.

## Guardrails

- No free-form agent actions; all operations must align with declared scope and allowed operations.
- Prompts are immutable once referenced; hash mismatches halt CI.
- CI is the sole authority for validation and merge readiness.
- Artifacts must be auditable and reproducible.

## Acceptance Criteria

- Agents can operate continuously without human discretion while maintaining safety and provenance.
- CI enforces scope, policy, verification tiers, and debt accounting automatically.
- Every change references a traceable prompt and emits an auditable archive.
