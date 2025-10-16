# Operations Runbook – v0.5 Guarded Rail

## Prereqs

- GitHub CLI authenticated (`gh auth login`)
- Node 20, Docker, k6, OPA

## One‑Time Setup

1. Create labels & issues: `./scripts/gh/create-sprint-v0_5.sh BrianCLong/summit`
2. Create branch & PR with files: `./scripts/repo/open-pr-sprint-v0_5.sh`

## Local Verification

- Policy: `opa test policies/ -v`
- k6 smoke: `GRAPHQL_URL=... GRAPHQL_TOKEN=... k6 run tests/k6/smoke.js`
- Evidence: `make mc-verify`

## CI Secrets

- `GRAPHQL_URL`, `GRAPHQL_TOKEN`

## Rollback

- Revert PR; disable workflow file via commit; roll back Helm canary using `helm rollback` to previous revision.
