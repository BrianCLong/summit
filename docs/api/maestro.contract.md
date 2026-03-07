# Maestro Contract (v1 foundation)

## Enforcement checkpoint
Before each job run, Maestro evaluates companyOS policy with action `JOB_RUN`.

## Required behavior
- Deny path: abort job launch and emit policy evidence.
- Allow path: attach `decisionId` to run metadata and emit policy evidence.

## Runtime gate
`COMPANYOS_ENFORCE` controls fail-closed enforcement rollout in v1.
