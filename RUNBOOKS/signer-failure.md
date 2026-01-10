# Runbook: Signer Failure

## Scope

Restore policy bundle signing and verification for OPA bundles and attestations.

## Signals

- Alert: signer service unavailable or bundle verification failures.
- Logs: signer service 5xx errors or `bundle signature invalid`.
- Metrics: increased `opa_bundle_downloads_failed` or failed signature checks.

## Immediate Actions

1. Confirm signer service health and deployment status.
2. Validate KMS key availability and signer secret mounts.
3. Pause bundle refresh if invalid signatures are propagating.

## Diagnosis

- Inspect signer logs for signing errors.
- Check notary configuration and key IDs.
- Validate policy bundle checksum and upload paths.

## Mitigation

- Restart signer pods or roll back the last signer image.
- Rotate signer keys if compromised or revoked.
- Re-issue policy bundles and trigger OPA bundle reload.

## Verification

- Successful signature verification for the latest bundle.
- `opa_bundle_downloads_successful` recovers.
- SLSA attestation and SBOM signing workflows succeed in CI.

## Escalation

- Notify security and release engineering if signing or KMS outages persist.
- Apply Governed Exception only with documented authorization.

## References

- Helm values: `helm/intelgraph/values.yaml`
- Terraform signer module: `terraform/modules/policy_signer`
