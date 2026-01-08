# Signer service and policy bundle operations

## API and SDK contract validation

1. Confirm `openapi/spec.yaml` exposes `/signer/attestations`, `/signer/attestations/verify`, and `/signer/keys`.
2. Regenerate the signing SDK (`packages/sdk/signing-js`) and run its contract tests:
   - `pnpm test -- --runTestsByPath packages/sdk/signing-js/index.test.js`
3. Verify clients use the published `SignerKey` versions before promoting bundle changes.

## Policy bundle refresh and simulation

1. Run `policy/build.sh` to package rego files and execute the regression harness.
2. Validate `policy/sample_inputs/signer.json` covers signer expiry and algorithm checks.
3. Use `policy/simulate-signer.sh` to dry-run signer evaluations prior to bundle promotion.

## Observability and alerting

1. Import `grafana/dashboards/signer-service.json` (or the Helm-provisioned copy) and confirm Prometheus datasource bindings.
2. Ensure Prometheus alert rules from `prom/alerts/signer.alerts.yaml` are loaded; page on attestation failures >1% or key TTL <24h.
3. Confirm CloudWatch/SNS wiring (Terraform `signer_service` module) points to the correct on-call topic.

## Deployment and configuration

1. Deploy the `helm/signer-service` chart with the desired bundle URI, signature, and refresh interval.
2. Ensure the monitoring chart (`helm/monitoring`) ships the signer dashboard into Grafana.
3. Apply Terraform in `terraform/` to publish bundle manifests and dashboard artifacts for the environment.
