# ADR-042: Deterministic Supply Chain Gate for Golden Path Builds

**Status:** Proposed  
**Date:** 2026-02-24  
**Author:** Codex  
**Deciders:** Platform TL, Security Engineering, SRE

## Context

The current supply-chain controls are present but not uniformly enforced as default blocking gates for all Golden Path build and deploy flows. This creates avoidable release variance and trust gaps.

Current governance posture already establishes hard requirements for secure and auditable delivery:

- `docs/SUMMIT_READINESS_ASSERTION.md` requires zero high-severity vulnerabilities and immutable governance controls.
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` includes SBOM scanning as a conditional check rather than an always-required gate.
- `docs/release-reliability/policies/release_gate.rego` already models production denial when `high_cves > 0` and unsigned images are detected.

Sprint 12 requires these controls to be enforced by default across Golden Path services.

## Decision

Adopt a deterministic, policy-gated supply-chain control plane for all Golden Path services with these mandatory controls:

1. Build-time SBOM generation:
- Generate CycloneDX SBOM at build time for each service artifact.
- Publish SBOM with artifact and store in registry-adjacent evidence storage.

2. Signing and verification:
- Sign container images with keyless Sigstore/cosign (OIDC identity policy).
- Verify signatures as blocking checks in deploy workflows.

3. Provenance attestation:
- Emit in-toto/SLSA-compatible provenance per build.
- Pin builder image by digest (`@sha256`) for deterministic provenance lineage.

4. CVE budget gate:
- Default budget is `max_high=0` for production promotion.
- Allow only timeboxed, approved waivers as Governed Exceptions with explicit expiry and owner.

5. OPA release gate expansion:
- Enforce license policy, residency tagging, and PII annotation presence.
- Block release when required metadata is missing.

6. Evidence retention and release contract:
- Release artifact contract must include `SBOM.json`, `attestation.json`, `vuln_report.json`.
- Evidence retention is immutable for minimum 30 days.

## MAESTRO Layers

- Foundation: deterministic build and artifact controls.
- Data: residency and PII annotation policy enforcement.
- Tools: OPA, SBOM generator, cosign verification.
- Infra: CI/CD workflows and registry trust chain.
- Observability: signed-artifact coverage and CVE budget dashboard metrics.
- Security: vulnerability budget, signature verification, provenance attestation.

## Threats Considered

- Dependency tampering or poisoned transitive dependency intake.
- Artifact substitution between build and deployment.
- Provenance forgery from mutable builder/runtime paths.
- Vulnerability acceptance drift via non-expiring waivers.
- Policy bypass by incomplete metadata (license/residency/PII).

## Mitigations

- Deterministic SBOM generation bound to produced artifact digests.
- Cosign sign/verify required before deploy admission.
- Builder digest pinning and provenance attestations for chain-of-custody proof.
- Timeboxed waiver workflow with explicit approval owner and expiration.
- OPA deny-by-default on missing compliance metadata.

## Consequences

- Positive:
  - Release trust becomes measurable and auditable by default.
  - High-CVE and unsigned-artifact risk is blocked before production.
  - Evidence generation becomes standardized for customer-facing trust artifacts.

- Negative:
  - CI execution time may increase due to added scanning and attestation steps.
  - Initial developer friction increases where services are not Golden Path compliant.

- Risks:
  - False positive CVE blocks can slow urgent delivery.
  - Keyless identity policy misconfiguration can block valid promotions.

## Alternatives Considered

- Option A: Keep current best-effort controls and rely on manual release review.
  - Rejected: does not meet Sprint 12 default-enforcement objective.

- Option B: Enforce only on tier-1 services.
  - Rejected: leaves exploitable gaps and inconsistent trust posture.

- Option C: Use key-based signing only.
  - Rejected: higher key management burden versus OIDC keyless path.
