# 118: Supply Chain Security & License Governance (SCA/SBOM)

Track: Feature Flags
Branch: feat/sca
Labels: feature-flag, area:security, area:compliance, ci:ci-gates

## Summary
Implement continuous SCA and SBOM generation with license policy enforcement and signed attestations, integrated into CI/CD and gated by SCA_ENABLED.

## Deliverables
- Go/Node service at `/security/supply-chain` for SBOM generation (SPDX/CycloneDX), vulnerability scanning, license checking, and Sigstore attestations.
- CI gates enforcing SBOM on every image, blocking disallowed licenses, and proving reproducible builds; export signed release manifests to Compliance Center (#64).
- Dashboards: vulnerability burn-down, license exceptions; GitHub App opens PRs with fixes.

## Constraints
- No proprietary scanners; open-source friendly; dual-control for license exceptions.
- Feature flag gating via `SCA_ENABLED`.

## DoD / CI Gates
- Policy enforcing disallowed licenses (e.g., AGPL) and baseline CVSS thresholds.
- Unit/integration tests for SBOM generation, license policies, and attestations.
- Pipeline verification of reproducible builds and attestation signing.

## Open Questions (Tuning)
- Disallowed license set (e.g., AGPL)?
- Baseline CVSS thresholds to block?

## Parallelization Notes
- Lives in CI/CD; produces attestations; no runtime coupling.
