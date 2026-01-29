# Skill: Create New App/Module

## Definition
Create a new Summit app/module scaffold that matches repo conventions, adds minimal documentation, and avoids touching unrelated zones.

## Success Criteria
- Generates a scaffold summary artifact that lists the module name, framework, and language.
- Produces no file changes outside the skill artifacts directory.
- Captures a trace with command execution and file change events.

## Constraints
- Allowed tools: shell, filesystem.
- Forbidden paths: server/, client/, apps/web/.
- Output must be written under `evals/skills/create-app-module/artifacts/`.

## Definition of Done
- Deterministic checks pass for trigger accuracy and artifact creation.
- Rubric checks pass for documentation completeness and naming consistency.
