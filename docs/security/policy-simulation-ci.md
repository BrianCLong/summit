# Policy Simulation CI Gate

A CI job enforces policy simulation on policy/proposal changes.

## Workflow

- Defined in `.github/workflows/ci.yml` as job `policy-simulation`.
- Triggers on pull requests/pushes when files under `server/src/policy/**`, `testpacks/analytics/**`, `testpacks/anomalies/**`, or proposal artifacts change.
- Runs `pnpm security:policy-sim --changed-only --baseline-ref origin/main`.
- Uploads `policy-simulation-report.json` as an artifact.

## Enforcement rules

- Exit code `2` → job fails (reject).
- Exit code `1` → job warns but does not hard-fail (needs_review) unless tightened in the future.
- Exit code `0` → success.

## Reproducing locally

```bash
pnpm install --frozen-lockfile
pnpm security:policy-sim --proposal out/proposals/<id>/proposal.json --baseline-ref origin/main --changed-only
```

## Safety guardrails

- Simulation uses in-repo fixtures only; no production bundles mutated or external calls made.
- Deterministic seeds and static anomaly baselines ensure reproducible reports.
