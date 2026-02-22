# Prompt: Maestro Long-Run Job Engine (Ralph++)

## Objective

Implement the Maestro Long-Run Job Engine with a governed job spec, checkpointing, cost governance, stop conditions, and CI gates that enforce advisory validation in PRs and strict evidence verification in release workflows.

## Scope

- libs/maestro/longrun/
- scripts/ci/
- docs/maestro/
- .github/workflows/
- docs/roadmap/STATUS.json
- agents/examples/
- prompts/registry.yaml

## Guardrails

- No new heavy dependencies; reuse existing libraries.
- Enforce deterministic stop conditions and explicit failure reasons.
- Evidence and checkpoints must be written to `.maestro/`.
- CI integration: advisory validation in PRs, strict evidence verification in release/GA.

## Deliverables

- LongRunJob schema and runner scaffolding.
- Checkpoint + evidence bundle manifest.
- Stop condition evaluation logic with tests.
- Docs and sample job spec.
