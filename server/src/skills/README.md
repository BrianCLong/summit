# Skills Controller Runtime

This module introduces a minimal, typed Skill ABI and a controller runtime for orchestrating skills with auditability and tracing. It is gated by the `SKILLS_CONTROLLER_ENABLED` feature flag so existing flows remain unchanged by default.

## Concepts

- **Skill ABI**: Typed contract including `SkillSpec`, `SkillContext`, and `SkillResult`. Inputs/outputs rely on Zod schemas for validation.
- **Registry**: Register skills with `registerSkill(spec, impl)` and retrieve them via `getSkill(id)` or `listSkills()`.
- **Policy Guard**: `assertSkillAllowed` checks capability and policy tag alignment with the caller context.
- **Controller Runtime**: `runController` loops over controller decisions, executes skills, enforces budgets, and emits structured audit events with tracing spans.

## Adding a Skill

1. Define a `SkillSpec` with schemas, capabilities, and policy tags.
2. Implement the `Skill` interface: `run(input, ctx, deps) => Promise<SkillResult>`.
3. Register the skill using `registerSkill(spec, impl)` or a dedicated registry instance.

## Demo Skill & Controller

- **Skill**: `skill.echo_provenance` echoes a message, emits provenance, and returns mock artifact/citation references.
- **Controller**: `SingleSkillThenStopController` runs the demo skill once then terminates with reason `goal_satisfied`.

## Feature Flag & Running the Demo

1. Enable the flag: `export SKILLS_CONTROLLER_ENABLED=true` (or set in `.env`).
2. Run the demo from the server package:
   ```bash
   cd server
   npm run skills:demo -- "echo this"
   ```
   The optional CLI argument overrides the default goal message.

## Observability & Events

The runtime emits audit events (`controller.decision`, `skill.start`, `skill.end`, `skill.denied`, `controller.terminated`) with tenant/actor/request/trace identifiers. Spans wrap controller decisions and skill execution, and durations are included in metrics.
