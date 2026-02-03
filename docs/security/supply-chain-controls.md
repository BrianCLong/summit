# Supply Chain Controls

## Threat Model

| Threat | Control | Status |
| -- | -- | -- |
| Tag Drift | Digest pinning + Policy Controller | Implemented |
| Artifact Substitution | Cosign Signing | Implemented |
| Vulnerable Dependencies | Distroless Base + SBOM | Implemented |
| CI Compromise | SLSA Provenance (Level 1+) | Implemented |

## Base Images

We use minimal base images (Chainguard or Distroless) to reduce attack surface.
- Runtime: `cgr.dev/chainguard/node` or equivalent.
- Builder: Standard Node/Go builders.

## Verification

Enforced via Sigstore Policy Controller.
Requires:
- Valid Signature from CI OIDC issuer.
- SPDX SBOM Attestation.
- SLSA Provenance Attestation.
