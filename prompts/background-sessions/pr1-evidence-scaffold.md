# Prompt: Background Sessions PR1 Evidence Scaffold

## Objective

Create the Background Sessions evidence scaffolding and required checks discovery plan.

## Required Outputs

- Evidence index + schemas for reports/metrics/stamps.
- Minimal deterministic evidence writer utility.
- Schema validation tests with positive + negative fixtures.
- Required checks discovery TODO.
- Roadmap status update for the new background sessions work.

## Constraints

- Keep changes additive and scoped to `modules/background_sessions/` plus the roadmap update.
- Do not introduce production integrations or feature flags.
- Ensure deterministic JSON output (timestamps only in stamp files).
