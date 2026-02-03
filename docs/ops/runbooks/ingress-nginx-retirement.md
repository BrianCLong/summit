# Runbook: Ingress NGINX Retirement

## Purpose

Maintain continuous readiness for ingress-nginx retirement by enforcing CI gates and monitoring
for drift in repository manifests.

## Preconditions

- `ci/verify-subsump-bundle` and `ci/deny-ingress-nginx` required checks are configured.
- Evidence bundles under `subsumption/ingress-nginx-retirement/runs/ci` are present.

## Run Steps

1. Run `node scripts/ci/verify_subsumption_bundle.mjs subsumption/ingress-nginx-retirement/manifest.yaml`.
2. Run `node scripts/ci/deny_ingress_nginx.mjs`.
3. If drift monitoring is enabled, run `node scripts/monitoring/ingress-nginx-retirement-drift.mjs`.

## Failure Modes

- False positives from manifests that include historical references.
  - Action: move references into documentation or explicitly remove deprecated controllers.
- Performance regression due to scanning large directories.
  - Action: adjust scan filters and re-run with evidence update.

## Rollback

Revert the bundle additions and remove required checks if the gate is blocking valid changes. Any
rollback is logged as a governed exception.
