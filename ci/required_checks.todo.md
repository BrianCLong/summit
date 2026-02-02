# Required Checks Discovery (TODO)

1. Open repo settings → Branch protection rules.
2. Record required status check names for default branch.
3. Paste them into `ci/required_checks.json`.
4. If names differ from our local gates, add a rename map.

## UI steps (GitHub)

1. Repo → Settings → Branches → Branch protection rule → "Require status checks"
2. Copy the exact check names into `ci/verifier_spec.md`.

## Discovered Checks (Preliminary)

- validate-release-policy
- lint-reason-codes
- security-scan
- sbom
- summit-influence-evidence
- summit-influence-evals
- summit-neverlog
- summit-supply-chain

## Temporary naming convention

Until discovered, gates are referenced as:

- summit/evidence
- summit/evals_smoke
- summit/promptpack_schema
- summit/tool_spec_quality
- summit/influence-evidence
- summit/influence-evals
- summit/neverlog
- summit/supply-chain

## Rename plan

Once the real names are known, update `ci/verifier_spec.md` and add a PR to map old→new for continuity.

## New Module Checks (pp_alerts)

- pp_alerts/tests (pending discovery of real name)
- pp_alerts/privacy-scan (pending discovery of real name)

## Swarm Module Checks (Kimi K2.5)

- swarm/budgets-check
- swarm/evidence-verify
- swarm/policy-gate
