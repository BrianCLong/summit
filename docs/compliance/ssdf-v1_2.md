# SSDF v1.2 Evidence Mapping (PO.6, PS.3.2, PS.4)

## Summit Readiness Assertion
This mapping is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## PO.6 Continuous Improvement
- Evidence: policy bundle version changes, toolchain version records, drift reports.
- Control: require periodic scanner/tool updates tracked in evidence bundles.

## PS.3.2 Provenance & SBOM Integrity
- Evidence: SBOM (SPDX + CycloneDX), SLSA provenance, signatures.
- Control: integrity-verifiable SBOM/provenance required for every release subject.

## PS.4 Robust & Reliable Updates
- Evidence: rollout and rollback artifacts, release gate decisions.
- Control: policy denies releases without rollback evidence and staged rollout plan.

## Evidence Pointers
Compliance reports must link to:
- Evidence ID
- Subject digest
- Policy bundle digest
- Verification report hash
