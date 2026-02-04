# Supply Chain Integrity Update (2026-01-14)

## Authority Alignment

- **Summit Readiness Assertion** is the controlling readiness reference for this update. Review and align all follow-on actions to it before implementation. See `docs/SUMMIT_READINESS_ASSERTION.md`.
- **Governed Exceptions** remain the only approved mechanism for legacy bypasses. Any exception must be documented and attached to the policy-as-code pipeline.
- **Policy-as-code mandate** applies to every compliance requirement in this update. If a requirement cannot be expressed as policy, it is incomplete and must be escalated for governance resolution.

## Executive Signal

Supply chain integrity remains an active, elevated risk domain. The immediate posture is to combine SBOM transparency, build provenance (SLSA), and secure development practices (SSDF) as a single enforcement surface, with policy-as-code enforcement in CI/CD and continuous monitoring from SBOMs.

## Scope & Ownership

- **Primary zone:** Documentation (`docs/`).
- **Owners:** Security engineering, platform CI/CD, and governance maintainers.
- **Verification tier:** C (documentation alignment and governance traceability).

## Standards & Best Practices (Operationalized)

1. **SBOM formats**
   - SPDX remains the primary SBOM standard; CycloneDX is maintained for interoperability.
   - Publish SBOMs alongside build artifacts and treat SBOM generation as a required build step.

2. **Framework synergy**
   - Align SBOM + SLSA + SSDF into a single integrity pipeline.
   - Provenance and signing are required for artifact promotion.

3. **Secure development lifecycle**
   - SSDF-aligned engineering practices remain the baseline for change control and vendor risk management.

4. **Tool integration**
   - Embed SBOM generation, signing (e.g., Sigstore), and provenance attestations into CI/CD.
   - Enforce with policy-as-code (OPA) in pre-merge and pre-deploy gates.

## Threat Landscape Summary

- Supply chain attacks are rising in volume and sophistication. Compromised build systems, CI abuse, and dependency attacks remain primary vectors.
- Past incidents confirm that provenance gaps and unsigned artifacts create systemic exposure.

## Summit Execution Directives (PR-Ready)

### 1) Build Pipeline Enhancements

**Scope:** CI configuration and build artifact pipeline.

**Actions:**

- Add Sigstore/cosign signing step for build artifacts.
- Generate in-toto provenance attestations referencing source commit and build context.
- Export SBOMs in SPDX and CycloneDX formats with release artifacts.
- Persist provenance metadata in the immutable audit ledger to preserve chain-of-custody.

**Validation:**

- Fail builds when signing or SBOM generation is missing.
- Verify provenance via reproducible build replay.
- Emit evidence artifacts (SBOMs, attestations, signatures) in CI output for audit capture.

### 2) Policy Enforcement (OPA)

**Scope:** Policy-as-code enforcement in CI/CD.

**Actions:**

- OPA policy: require artifact signature at or above target assurance.
- OPA policy: block merge if SBOM is missing or outdated.
- CI hook to evaluate OPA policy before merge.
- Log policy decisions requiring compliance review in the decision ledger.

**Validation:**

- Policy compliance dashboard per PR.

### 3) Dependency & Drift Monitoring

**Scope:** Lockfiles and scheduled verification.

**Actions:**

- Scheduled job to detect lockfile drift.
- Automated PRs for dependency upgrades with SBOM regeneration.
- Track dependency deltas against an allowlist with policy exceptions only.

**Validation:**

- Compare lockfile hashes and SBOM diffs on schedule.

### 4) Documentation & Onboarding

**Scope:** Documentation and runbooks.

**Actions:**

- Document accepted standards (SPDX 3, CycloneDX profiles, SLSA goals).
- Provide runbooks for incident handling and provenance verification.
- Add an onboarding checklist for new services that includes SBOM/provenance requirements.

## Evidence & Artifacts (Required)

- **SBOMs:** SPDX + CycloneDX, stored with release artifacts.
- **Provenance:** in-toto attestations referencing source commit, builder identity, and build parameters.
- **Signatures:** Sigstore/cosign signatures on build artifacts.
- **Policy logs:** OPA decision logs tied to PR identifiers.

## Controlled References (Internal Authority Files)

- `docs/CI_CD_SUPPLY_CHAIN_INTEGRITY_PLAN.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `docs/SBOM-VULN-AUTOMATION.md`
- `docs/SECURITY_VALIDATION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/AGENT_MANDATES.md`

## Decision Log

- **Alignment Requirement:** All supply chain integrity policy changes must reference the authority files above. This is a mandatory alignment rule.
- **Exception Model:** Legacy bypasses are reclassified as **Governed Exceptions** and must be tracked in policy-as-code.
- **Compliance Logging:** All policy decisions that require compliance or ethics review must be logged with traceable identifiers.

## Forward-Leaning Enhancement

- Adopt a **SLSA provenance policy gate** that blocks artifact promotion unless the attestation meets a minimum builder identity threshold and includes reproducibility evidence.

## Next Actions

- **Immediate:** Convert the directives above into scoped implementation tasks with owners and verification tiers.
- **Deferred pending governance review:** Expanded attestation schema and external verification service integrations.
- **Intentionally constrained:** No changes to CI/CD or policy code in this documentation-only update.
