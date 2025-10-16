# Verification, Policy Gate, and Alerts

## Cosign Verification

Use `release.verify-attestation.yml` to verify SLSA attestations for an OCI image or to check a local artifact placeholder.

- Recommended: publish images (or attestations) to a registry and verify with `cosign verify-attestation --type slsaprovenance`.
- For file-based flows, wire your attestation retrieval and set `provenance_present=true` before OPA evaluation.

## OPA Release Gate

- Policy: `policies/release_gate.rego`
- Workflow: `policy.check.release-gate.yml` evaluates `allow`. Fails the job (and thus the tag pipeline) if evidence is missing.

## Alerts

- Prometheus rules in `monitoring/alerts/ci_alerts.yml` for p95 duration, failure-rate, and flaky spikes.
- Import alongside the Grafana dashboards from your previous bundle to enable end-to-end visibility & paging.
