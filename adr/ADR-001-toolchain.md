# ADR-001: Golden Path Toolchain Selection

## Status

Accepted

## Context

The Golden Path Platform must deliver paved-road automation that produces signed, SBOM-attached, provenance-verified releases out of the box for HTTP APIs, async workers, and web UIs. The toolchain must be reproducible, SLSA-aligned, and friendly to platform teams that need deterministic builds with guardrails around supply-chain security.

## Decision

We will deliver a Node.js based scaffolding CLI named **Railhead** that emits service repositories from curated templates. Each template pins Node runtime 20.x, NPM dependencies, and GitHub Actions workflows resolved to immutable commit SHAs. We will standardize on the following supply-chain controls:

- **SBOM Generation:** Anchore Syft CLI executed via GitHub Actions container image `anchore/syft:v0.104.0`.
- **Vulnerability Scanning:** Anchore Grype CLI (`anchore/grype:v0.78.0`) to validate SBOM outputs against a configurable CVE budget.
- **Signing:** Sigstore Cosign keyless signing (`sigstore/cosign-installer@c6df43d2f0fa2edfe1a8d43e6cdd58a3b22b8b82`).
- **Provenance:** `slsa-framework/slsa-github-generator@a3dbca39b756bd78c58c8f6046354f12c16128f8` to emit SLSA v1.0 provenance attestations.
- **Policy Enforcement:** OPA/Rego bundles consumed by CI and admission controllers, with policy inputs provided as SARIF, SPDX, and build metadata JSON.
- **Artifact Storage:** OCI-compatible registries (GitHub Container Registry by default) with cosign verification prior to deployment.

All templates will install `pre-commit` hooks to run formatting, linting, secret scanning, and policy validation locally before commits.

## Consequences

- Engineers inherit a deterministic CI/CD pipeline with SLSA level 3+ provenance guarantees and cosign-verified releases.
- Platform teams can manage guardrails centrally by updating the OPA bundle shipped with the CLI.
- The CLI must be updated when upstream tool SHAs change; to make this manageable we will include a lock manifest enumerating the pinned versions.
- Because keyless signing depends on GitHub OIDC, self-hosted runners must be configured with outbound access to Sigstore Fulcio and Rekor endpoints.

## References

- [Sigstore Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator)
- [Anchore Syft](https://github.com/anchore/syft)
- [Anchore Grype](https://github.com/anchore/grype)
