# Maestro Runtime Policy Contract (v1 Foundation)

## Purpose
Define how Maestro must request and enforce companyOS policy decisions before job execution.

## Inputs
- Job metadata with `orgId`, `actorId`, `jobId`, and action `JOB_RUN`.
- Optional policy enrichment fields: `riskTier`, `tokenEstimate`, `repo`.

## Enforcement Behavior
1. Evaluate policy before scheduling or dispatch.
2. Deny if required policy context is missing.
3. Deny if companyOS decision returns `allowed=false`.
4. Attach `decisionId` to run metadata when execution is allowed.

## Evidence Behavior
- Emit `policy.decision` and `job.run` records with shared `decisionId`.
- Persist deterministic artifacts plus timestamp stamp.

## Kill Switch
- `COMPANYOS_ENFORCE=0` disables hard enforcement for rollout phases.
- `COMPANYOS_ENFORCE=1` enables deny-on-policy behavior.
