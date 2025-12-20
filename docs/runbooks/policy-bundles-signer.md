# Policy Bundle Promotion & Signer Runbook

## Purpose

This runbook documents the end-to-end workflow for refreshing policy bundles, running simulations, and publishing signed artifacts.

## Prerequisites

- Access to the IntelGraph build artifacts bucket
- Credentials for the signer service (`SIGNER_KEY_ID` and signing key)
- OPA toolchain available locally (`opa` and `conftest`)

## Steps

1. **Build & Verify Bundle**
   - Run `cd policy && ./build.sh` to produce `maestro-policy-bundle.tgz`.
   - Validate the bundle with `opa test policy policy/tests`.
2. **Simulate Changes**
   - Use the new simulation endpoint: `curl -X POST $API/api/policy/simulations -d @scenario.json`.
   - Confirm `decision_trace` contains expected rules and signer metadata.
3. **Publish & Sign**
   - Upload the bundle to the artifacts bucket.
   - Request an attestation via `POST /api/signing/attestations` with the bundle digest.
4. **Deploy**
   - Update Helm values: `signer.bundle.url` and `signer.bundle.signerKeyId`.
   - Apply Terraform module `policy_signer` to expose dashboards/alerts metadata.
5. **Verify**
   - Check Grafana dashboard **Policy & Signing** for latency and attestation counts.
   - Ensure Prometheus alert rule set `policy-signer` is loaded (version `v0.3.9`).

## Rollback

- Revert Helm values to the previous bundle URL and signer key id.
- Invalidate attestation tokens associated with the faulty bundle.
- Confirm alerts clear after rollback and simulations return to baseline.
