# Release Signing Operations

## Keyless Signing
We use Sigstore Cosign for keyless signing via GitHub Actions OIDC.
The issuer is `https://token.actions.githubusercontent.com`.
The subject is the GitHub workflow reference.

## Policy Controller
The Kubernetes Policy Controller verifies these signatures before admission.
It uses `ClusterImagePolicy` to verify that the image was signed by this repository's CI.

## Debugging
To verify manually:
```bash
cosign verify \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "^https://github.com/BrianCLong/summit/.+" \
  ghcr.io/brianclong/summit@sha256:...
```
