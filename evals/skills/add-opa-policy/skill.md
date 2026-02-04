# Skill: Add OPA Policy Rule

## Definition
Author a policy-as-code rule with tests and decision logging aligned to Summit governance.

## Success Criteria
- Produces a policy summary artifact that records policy name and test count.
- Avoids modifying production policy files outside artifacts during evaluation.
- Captures trace events for command execution and file changes.

## Constraints
- Allowed tools: shell, filesystem.
- Forbidden paths: server/, client/, apps/web/.
- Output must be written under `evals/skills/add-opa-policy/artifacts/`.

## Definition of Done
- Deterministic checks pass for trigger accuracy and policy artifact creation.
- Rubric checks pass for governance alignment and documentation completeness.
