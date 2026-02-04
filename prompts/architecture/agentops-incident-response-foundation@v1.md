# AgentOps Incident Response Foundation (v1)

## Objective

Establish the AgentOps incident-response foundation with deterministic evidence artifacts, deny-by-default posture, and read-only connectors. This prompt focuses on the evidence subsystem and roadmap alignment required for merge-ready scaffolding.

## Scope

- Create evidence schemas and writer for deterministic artifacts.
- Add minimal tests that enforce determinism (timestamps only in stamp.json).
- Update `docs/roadmap/STATUS.json` to reflect progress.

## Constraints

- No autonomous writes; read-only by default.
- Evidence artifacts must be deterministic with timestamps isolated to stamp.json.
- Changes remain additive and reversible.

## Deliverables

- Evidence schemas and writer module.
- Unit tests for evidence writer.
- Roadmap status update referencing the work.
