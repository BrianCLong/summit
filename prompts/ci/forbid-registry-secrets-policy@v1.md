# Prompt: Forbid Registry Secrets Policy Gate

## Objective
Implement a deterministic CI policy gate that rejects long-lived private registry secrets in
GitHub Actions workflows and Dependabot configuration while emitting stable policy artifacts.

## Scope
- Add a policy script under `.github/scripts/policy/` to scan GitHub workflows and Dependabot
  configuration for forbidden registry secret identifiers.
- Add unit tests and fixtures under `.github/scripts/__tests__/`.
- Add a GitHub Actions workflow to run the policy gate and publish artifacts.
- Update `docs/roadmap/STATUS.json` to record the initiative.

## Constraints
- Outputs must be deterministic: no timestamps.
- CI job must fail on violation and produce `artifacts/policy/report.json` and
  `artifacts/policy/stamp.json`.
- Keep changes focused to CI/policy gating only.
