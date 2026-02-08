# PR Provenance + SBOM Visibility (Sigstore)

This guide wires keyless Sigstore signing, SPDX SBOM generation, and a PR-visible
badge endpoint for Summit pull requests. It aligns with the Summit Readiness
Assertion and keeps provenance evidence visible and enforceable on every PR.

## What This Adds

- **Keyless cosign signing + attestation**: Uses OIDC with Fulcio/Rekor to sign
  the container image digest and attach an SPDX SBOM attestation.
- **SBOM artifact**: Generates SPDX JSON via Anchore SBOM action.
- **Evidence badge JSON**: Emits a deterministic `badge.json` suitable for
  Shields.io endpoint badges and bot comments.
- **Policy-controller starter pack**: Rego policy + Helm values to enforce
  signature and SBOM attestation at admission time.

## GitHub Actions Workflow

The workflow is located at:

- `.github/workflows/pr-provenance-sbom.yml`

It builds and pushes a container image, generates an SPDX SBOM, signs the image,
attests the SBOM, and uploads the evidence artifacts.

### Badge Endpoint

Publish `evidence/<commit>/badge.json` to a stable URL (e.g., GitHub Pages,
object storage, or a small evidence service) and use the Shields endpoint badge:

```
![Provenance](https://img.shields.io/endpoint?url=https://<host>/evidence/<commit>/badge.json)
```

### Bot Comment (Optional)

A single updating comment can read the artifact and post a short table:

- Status (`pass`/`fail`)
- Attestation (`spdx`)
- SBOM link

## Policy Controller (Sigstore) Starter Pack

Use the sample Rego and Helm values in:

- `docs/supply-chain/policy-controller/policy.rego`
- `docs/supply-chain/policy-controller/values.yaml`

These require:

- Signature by your GitHub OIDC identity.
- An SBOM attestation of type `spdx`.

## Operational Notes

- For forked PRs, the workflow is gated to avoid credential leakage.
- Evidence JSON is deterministic (no timestamps) to keep badge caching stable.
- The policy controller should be deployed in a staging cluster before rollout
  to production.
