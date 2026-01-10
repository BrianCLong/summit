# Agent Run Lifecycle (Closed-Loop)

## Status & Precedence

This document defines GA execution requirements. It is subordinate to
`docs/governance/CONSTITUTION.md` and `docs/governance/AGENT_MANDATES.md`, and complements
`docs/ga/AGENTS.md` and root `AGENTS.md`.

This lifecycle makes every agent action governable, reproducible, and auditable.

## 1. Prompt Capture (Immutable Origin)

- Author the task prompt under `prompts/` and register it in `prompts/registry.yaml` with SHA-256 content hash.
- Compute the hash using `sha256sum` and keep it immutable once referenced by a task.
- Registry entry declares allowed scope paths, domains, and operations to bind execution.

## 2. Task Contract (ATS)

- Create a task specification conforming to `agents/task-spec.schema.json` (examples in `agents/examples/`).
- Declare scope, allowed operations, verification tier, debt budget, and stop conditions before any edits.

## 3. Execution Plan & PR Metadata

- Populate `.github/PULL_REQUEST_TEMPLATE.md` including the JSON block between `<!-- AGENT-METADATA:START -->` and `<!-- AGENT-METADATA:END -->`.
- Metadata must reference the registered prompt hash and mirror the ATS scope and operations.

## 4. CI Enforcement

- Run `scripts/ci/verify-prompt-integrity.ts --prompt-hash <hash>` to verify hash fidelity and diff scope compliance.
- Run `scripts/ci/validate-pr-metadata.ts --body <pr-body-path> --output artifacts/agent-runs/{task_id}.json` to validate metadata, align scope, and emit the execution record.
- CI gates fail on: missing metadata, hash mismatch, scope violations, missing verification tiers, or debt overruns.

## 5. Deterministic Merge & Archive

- When CI is green, merge automatically or mark merge-ready per governance settings.
- Archive the following in `artifacts/agent-runs/{task_id}.json` and CI artifacts: prompt ref, ATS, verification evidence, diff summary, debt delta, and enforced policies.
- Store metrics in `agent-metrics.json` (per schema in `metrics/agent-metrics.schema.json`).

## 6. Provenance & Auditing

- Each run links task_id → agent_id → prompt_hash → diff paths, enabling replay and forensics.
- Registry + ATS + execution record provide complete provenance without human memory.

## 7. Failure & Escalation

- Failures produce structured artifacts described in `docs/ga/AGENT-FAILURE-MODES.md` with remediation steps and retry guidance.
- Agents must either retry within the declared scope or escalate with evidence when stop conditions trigger.
