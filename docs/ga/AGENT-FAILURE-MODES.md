# Agent Failure Modes and Remediation

## Status & Precedence

This document defines GA failure classifications. It is subordinate to
`docs/governance/CONSTITUTION.md` and `docs/governance/AGENT_MANDATES.md`, and complements
`docs/ga/AGENTS.md` and root `AGENTS.md`.

Failures are first-class outcomes. Every CI failure must be classified, archived, and remediated through a constrained loop.

## Failure Codes

- **POLICY_VIOLATION:** Scope breach, forbidden operation, or missing governance artifact (e.g., prompt hash mismatch).
- **VERIFICATION_MISSING:** Required verification tier or evidence artifact absent.
- **DEBT_REGRESSION:** Debt delta exceeds budget or retirement target unmet.
- **INFRA_TOOLING:** CI/tooling error preventing validation (network, runner, dependency).
- **DATA_QUALITY:** Inputs (prompts/specs) malformed or incomplete.

## Artifact Requirements

For each failure, emit a JSON artifact alongside CI output containing:

- `task_id`, `agent_id`, `prompt_hash`
- `failure_code` (values above) and `message`
- `observed_at` timestamp
- `remediation_hint` referencing the required fix
- `blocked_operations` (if escalation required)

## Remediation Workflow

1. **Detect:** CI flags failure and writes artifact.
2. **Diagnose:** Agent reviews artifact, ATS, and registry entry to confirm scope and allowed operations.
3. **Decide:**
   - Retry within the same scope after addressing remediation hint, **or**
   - Escalate with evidence to governance if stop conditions or policy forbids retry.
4. **Record:** Updated execution record appended with new attempt, linking old and new artifacts.

## Examples of Remediation Hints

- POLICY_VIOLATION: "Diff touches paths outside registry scope. Constrain changes to {paths}."
- VERIFICATION_MISSING: "Tier A required: attach coverage report and OPA policy output."
- DEBT_REGRESSION: "Debt delta +2 exceeds budget 0. Retire ≥2 units or propose exception."
- INFRA_TOOLING: "Runner missing js-yaml. Install dependency or rerun on healthy runner."
- DATA_QUALITY: "Prompt hash absent. Register prompt in prompts/registry.yaml and rerun integrity check."

## Escalation Rules

- Stop immediately if failures coincide with declared stop_conditions in the ATS.
- Escalate to governance for scope expansion; retries must remain within declared scope and allowed operations.
- Record human approvals in ATS `approvals` if granted.
