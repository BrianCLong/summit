# Skill: Fix Failing CI / Flaky Test

## Definition
Diagnose and remediate failing CI checks with a clear verification plan.

## Success Criteria
- Produces a CI fix summary artifact with root cause and verification steps.
- Avoids touching source files outside evaluation artifacts.
- Captures trace events for command execution and file changes.

## Constraints
- Allowed tools: shell, filesystem.
- Forbidden paths: server/, client/, apps/web/.
- Output must be written under `evals/skills/fix-failing-ci/artifacts/`.

## Definition of Done
- Deterministic checks pass for trigger accuracy and fix artifact creation.
- Rubric checks pass for documentation completeness and prompt coverage.
