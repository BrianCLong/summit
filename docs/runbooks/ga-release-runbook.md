# GA Release Runbook

This runbook provides the comprehensive, step-by-step procedure for safely cutting a General Availability (GA) release of Summit. An on-call engineer or release captain should execute these steps sequentially.

## 1. Pre-Release Checklist

Before initiating the GA release build, ensure the following conditions are met:

- [ ] CI is completely green (lint, type checks, smoke tests, unit tests, e2e tests, chaos dry-run).
- [ ] Ensure all required SBOMS are generated and attached.
- [ ] CVE scan results are less than or equal to the defined acceptable threshold.
- [ ] Cosign signatures and SLSA provenance are verified.
- [ ] Pre-flight migration validators have PASSED and a database backup has been taken.
- [ ] Residency and retention policies are verified per tenant.
- [ ] Rollback script is rehearsed, and the on-call schedule is set and active.
- [ ] A Go/No-Go decision has been approved by the release committee.

## 2. Build and Artifact Verification

Verify the integrity of the build artifacts prior to deployment:

- [ ] Run the `deploy-verify-attest` workflow with the correct inputs: `chart`, `namespace`, and `release` versions.
- [ ] Confirm `cosign verify` completes successfully against the container images.
- [ ] Confirm the `verify-attestation` step (SPDX + SLSA) passes.
- [ ] Ensure the container image digests in the release manifest precisely match the signed digests.

## 3. Staged Rollout Procedure

Proceed with a staged deployment, minimizing blast radius:

- [ ] Perform the initial deployment to the staging environment using the pinned digest: `helm upgrade --install <release> <chart> -n <ns> -f values.release.yaml`.
- [ ] Monitor the staging rollout for 10-15 minutes, validating that no error spikes or latency regressions occur.
- [ ] Promote to the first production ring (e.g., internal tenants or a 5% canary).
- [ ] Run SLO Canary (`k6`) tests against the target URL: `https://...`.
- [ ] Verify threshold metrics: p95 < 700ms, p99 < 1.5s, error rate < 1%.
- [ ] If the canary is stable for 30 minutes, promote to the remaining production rings.
- [ ] Verify that any required data migrations are completed and the logs indicate idempotency.

## 4. Smoke Tests

Perform functional smoke tests to guarantee core operation:

- [ ] Verify all health endpoints return `200 OK`.
- [ ] Execute core GraphQL queries (including persisted queries).
- [ ] Execute core GraphQL mutations.
- [ ] Verify the returned data shapes from the API match expected schemas.

## 5. Rollback Procedure

If severe regressions are detected during the rollout or smoke tests, execute a fast backout.

**Signals for Immediate Rollback:**
- Production error rate (PRR) > 1% sustained for 5 minutes.
- SLO burn rate > 2x over budget for 10 minutes.
- Cosign verification failure post-deploy (cluster image mismatch) or Gatekeeper policy breach.

**Rollback Steps:**
1. Execute the rollback command: `helm rollback <release> <previous-revision> -n <ns>`.
2. Invalidate edge caches/CDN if web assets were changed.
3. Verify system health and rerun the `k6` canary tests on the previous version.
4. File an incident ticket detailing the timeline, attaching relevant logs and Grafana snapshots.

**Data Migrations Considerations:**
- Prefer forward-only migrations. Do not execute a rollback that drops data in the same release.
- If a backward-breaking migration was shipped and a rollback is required, activate read-only mode and execute `down.sql` *only* if explicitly safe and previously tested.

## 6. Post-Release Monitoring

Ensure stability following the successful rollout:

- [ ] Tag the release in `release-notes-template.md`.
- [ ] Send the release announcement to stakeholders.
- [ ] Monitor error rates, latency (p95/p99), and resource saturation for the next 4-6 hours.
- [ ] Review alerts in the `#alerts-production` channel for any anomalies.
