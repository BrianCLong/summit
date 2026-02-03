# ADR 0011: CI Gate Stabilization and GA Gate Enforcement

## Status

Accepted

## Context

CI reliability is a dependency for governance gates, evidence collection, and merge order. Workflow jobs referenced invalid action versions and the GA gate workflow was missing, while an ESM package used a Jest config format incompatible with the runtime verification checks. These gaps introduced avoidable CI failures and reduced confidence in gate enforcement.

## Decision

1. **Pin critical GitHub Actions to supported versions** across CI workflows to eliminate invalid action references.
2. **Introduce a dedicated GA gate workflow** that runs the canonical GA gate script and publishes its report as an artifact.
3. **Align Jest configuration for ESM compatibility** by converting the ESM package Jest config to `.cjs` so runtime verification and Jest resolution are consistent.

## Consequences

- CI workflows become syntactically valid and predictable under actionlint and GitHub Actions execution.
- GA gate enforcement becomes explicit and auditable through a dedicated workflow and report artifact.
- Jest runtime verification passes consistently for ESM packages using Jest.

## Rollback Plan

- Revert the action pin updates to prior tags if upstream policies mandate different pins.
- Remove `.github/workflows/ga-gate.yml` to restore previous GA gate behavior.
- Restore the prior Jest config filename if the package transitions back to CommonJS.

## Verification

- Workflow syntax validation via existing workflow linting.
- GA gate workflow generates `artifacts/ga-gate-report.json`.
- Runtime verification job no longer flags ESM Jest config incompatibility.
