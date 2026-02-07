# Repo Assumptions & Validation

## Verified (Local)

- Repo root contains `agentops/`, `agents/`, `audit/`, `artifacts/`, `RUNBOOKS/`, `SECURITY/`,
  `.github/`, and `.ci/`.
- Observability/metrics surfaces exist under `observability/` and `metrics/`.

## Deferred Pending Validation

The following are intentionally constrained until direct inspection confirms the exact
runtime and CI hook points:

- Primary agent action proposal/execution entrypoints and interception hooks.
- Existing audit/event schema for DecisionRecord-like entries.
- Evidence bundle format and enforcement gates.
- CI required-check mapping and policy gate names.

## Validation Commands (Exact)

1. Locate agent execution entrypoints:
   - `rg "agent|planner|runner|workflow|task|job" -n agentops agents workflows`
2. Find audit/event schema:
   - `rg "DecisionRecord|audit" -n audit governance`
3. Discover evidence formats:
   - `rg "evidence|artifact" -n artifacts evidence docs`
4. Enumerate CI required checks:
   - `ls .github/workflows`
   - `rg "required" -n .github/required-checks.yml docs`

## Must-Not-Touch (Policy Guardrails)

- `archive/` (historical content)
- `.disabled/` (quarantined or disabled features)
- `node_modules/` (third-party vendored content)
- `dist/` and other build outputs
