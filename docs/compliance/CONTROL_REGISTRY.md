# Control Registry

## Supply Chain Integrity (SCI)

| ID          | Control Name                      | Description                                                                                                | Enforcement                                                                            |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **SCI-001** | **Deterministic Build Output**    | Release artifacts MUST be bitwise reproducible given the same source commit and inputs.                    | `scripts/release/generate_evidence_bundle.mjs` (Canonical JSON, Normalized Timestamps) |
| **SCI-002** | **Evidence Drift Detection**      | Release process MUST verify that the generated evidence bundle matches the committed evidence for the tag. | `verify-release-bundle.mjs --regenerate-and-compare`                                   |
| **SCI-003** | **Cryptographic Non-Repudiation** | All release provenance manifests MUST be cryptographically signed by a trusted identity.                   | `cosign` (Keyless OIDC) via GitHub Actions                                             |
| **SCI-004** | **Bundle Policy Enforcement**     | Evidence bundles MUST contain all required manifests as defined in the governance policy.                  | `verify-release-bundle.mjs --strict` + `policy/evidence-bundle.policy.json`            |

## Access Control (AC)

| ID         | Control Name           | Description                                                                            | Enforcement                     |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| **AC-001** | **Least Privilege CI** | CI jobs MUST use short-lived OIDC tokens instead of long-lived secrets where possible. | GitHub Actions OIDC Integration |
