# Public Comment Letter: NIST SP 800-218 Rev.1 (SSDF v1.2 IPD)

## Executive Summary

Summit is a compliance-first, evidence-driven platform delivering secure software development and supply chain assurance. Our controls emphasize deterministic evidence bundles, provenance verification, and policy-as-code enforcement across CI/CD. We align to the authority chain in `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, and the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Strong Endorsements

1. **Continuous assurance framing**: The v1.2 emphasis on evidence over checklists aligns with Summit’s evidence-bundle model and Evidence-ID consistency gates.
2. **Expanded practices for dependency governance (PS.4)**: This explicitly validates the need for SBOM quality and dependency policy gates in CI.
3. **Risk-centric language**: The updated risk posture language matches Summit’s operational risk ledger and security action plan workflow.

## Concrete Improvement Suggestions

### 1) Explicit CI/CD Evidence Expectations

Recommend requiring a machine-verifiable evidence manifest for each release. This should include build logs, SBOM artifacts, provenance attestations, and evidence freshness metadata.

### 2) Stronger Provenance Verification Language

SSDF should require verification of attestation signatures prior to merge and release, not merely generation of provenance artifacts. Summit treats signature verification as a required gate.

### 3) Clearer Guidance on Automation vs. Manual Controls

Automated CI/CD evidence checks should be mandatory where feasible. Manual controls should only be used when automation is technically impossible and must be explicitly documented with mitigation and timeline to automation.

## Proposed Text (Redlines / Insertions)

> **Insert in PS.4 (Dependency and Build Input Integrity)**
>
> **Current**: “Verify the integrity of third-party components.”
>
> **Proposed**: “Verify the integrity and provenance of third-party components _prior to merge and release_ using machine-verifiable signatures and SBOM quality gates; retain evidence manifests for auditability.”

> **Insert in PO.6 (Continuous Assurance Evidence)**
>
> **Current**: “Collect and maintain evidence of secure development practices.”
>
> **Proposed**: “Collect, hash, and retain evidence artifacts (build logs, SBOMs, provenance attestations) in a deterministic evidence manifest tied to each build and release; enforce evidence freshness and integrity checks in CI/CD.”

> **Insert in PW.7 (Build Integrity and Traceability)**
>
> **Current**: “Generate SBOMs and provenance for releases.”
>
> **Proposed**: “Generate and _verify_ SBOMs and provenance for releases; reject builds that lack signature verification or fail evidence-ID consistency.”

## Closing

Summit supports the direction of SSDF v1.2 and recommends explicit, machine-verifiable evidence requirements to prevent checkbox compliance. The proposed additions align SSDF with current CI/CD supply chain practices and support audit-ready, reproducible assurance.
