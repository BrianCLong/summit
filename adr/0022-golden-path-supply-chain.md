# 0022 - Golden Path Supply Chain Controls for Reference Artifacts

- Status: Proposed
- Date: 2025-12-29
- Deciders: Supply Chain Guild, DevSecOps
- Tags: compliance, sbom, slsa, cosign, ci-cd, provenance
- Area: Compliance

## Context

Summit requires a paved road CI/CD pipeline that guarantees software supply chain integrity for teams delivering containerized services. Prior efforts produced ad-hoc SBOM generation and optional signing, which left release gates unable to prove:

- Every promoted artifact is accompanied by a verifiable SBOM (CycloneDX/SPDX).
- Images are signed and verifiable with OIDC identities.
- SLSA-style provenance exists and is enforceable in policy.
- License and CVE risk thresholds are enforced consistently with an allowlist for exceptions.

Without a single reference implementation, teams duplicate effort and drift from compliance standards, making it difficult to prove integrity during audits or to validate artifacts in offline environments.

## Decision

Implement a golden-path pipeline anchored on the `authz-gateway` container image as the reference artifact. The pipeline:

1. Uses the existing `_reusable-slsa-build.yml` workflow to build, sign (cosign keyless), and generate CycloneDX/SPDX SBOMs.
2. Generates SLSA v3 provenance via the official `slsa-github-generator`.
3. Attests SBOMs and provenance and uploads them as artifacts alongside the image digest.
4. Runs a reusable policy gate (`reusable/supply-chain-policy.yml`) that fails the build if SBOMs, signatures, or attestations are missing/invalid.
5. Enforces license and CVE policy via `scripts/supply_chain/gate.py` with allowlists (`security/supply-chain/*`).
6. Publishes a reusable evidence bundle (SBOMs + digests) for clean-room verification.

## Alternatives Considered

### Manual per-service hardening

- **Pros:** Teams tailor controls to their stacks.
- **Cons:** Fragmented tooling, inconsistent attestations, no shared gate logic, higher maintenance.
- **Reason rejected:** Violates paved-road principle; increases audit overhead.

### Third-party proprietary supply chain SaaS

- **Pros:** Turnkey dashboards and policy UI; outsourced maintenance.
- **Cons:** Cost, vendor lock-in, limited offline verification, opaque policy logic.
- **Reason rejected:** We prioritize open, verifiable controls using cosign/SLSA and in-repo policy code.

### Sign-only without provenance

- **Pros:** Simpler pipeline, fewer moving parts.
- **Cons:** Cannot prove build recipe or inputs; fails SLSA expectations; weakens incident response.
- **Reason rejected:** Provenance is mandatory for traceability and regulatory evidence.

## Consequences

### Positive

- Reproducible supply chain evidence for audits and release readiness.
- Shared reusable gate reduces per-team implementation burden.
- Allowlist mechanism provides controlled flexibility without bypassing policy.

### Negative

- Builds gain additional runtime for SBOM generation, signing, and grype scans.
- Requires cosign/grype toolchain availability in CI runners.

### Neutral

- Pipeline is reference-focused on `authz-gateway` but parameterized for other services.

## Implementation

- `.github/workflows/golden-path-supply-chain.yml` orchestrates build, attestation, policy gate, and evidence publication.
- `.github/workflows/reusable/supply-chain-policy.yml` verifies cosign signatures/attestations and enforces SBOM presence plus license/CVE policy.
- `scripts/supply_chain/gate.py` implements allowlist-based license/CVE checks.
- `security/supply-chain/*` defines allowlists for licenses and CVEs.
- `docs/golden-path/cicd.md` documents adoption and verification.

## Validation

- Gate fails if SBOM files are removed or renamed.
- Gate fails if cosign verification or `slsaprovenance` attestation verification fails.
- Gate fails when a disallowed license or HIGH/CRITICAL CVE (not allowlisted) is detected in SBOM scan.
- Evidence bundle (`golden-path-bundle-<run_id>`) can be verified in clean-room environments with cosign + grype.
