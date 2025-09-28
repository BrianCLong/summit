# Admission Controller Guardrails

This controller ensures only cosign-signed artifacts with valid SLSA provenance are admitted to the cluster.

## Verification Flow

1. Fetch release artifact digest from OCI registry.
2. Run `cosign verify --certificate-identity-regexp` against the digest.
3. Validate provenance using the SLSA verifier (see `verify-provenance.sh`).
4. Deny admission if any step fails or if policy bundle evaluation returns `deny` messages.

## Configuration

Deploy this controller with access to the `policy/golden-path/bundle` compiled bundle and configure the workload identity to trust GitHub OIDC.
