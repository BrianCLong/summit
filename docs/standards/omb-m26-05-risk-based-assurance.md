# OMB M-26-05: Adopting a Risk-based Approach to Software and Hardware Security

## Context
OMB Memorandum M-26-05 (Jan 23, 2026) rescinds the universal, one-size-fits-all attestation requirements of M-22-18 and M-23-16. It shifts the burden of assurance to agency-specific, risk-based assessments.

## Policy Shifts
- **Rescission:** M-22-18 and M-23-16 are no longer active.
- **Agency Discretion:** Agencies determine what evidence is required based on their specific risk profile.
- **SBOM on Request:** SBOMs are no longer a universal checkbox but may be required contractually upon request.
- **Machine-Readability:** Emphasis on automation-friendly, machine-readable evidence (SPDX/CycloneDX).

## Summit Implementation
Summit adopts an "Evidence-Pack-First" posture, providing a deterministic bundle of machine-readable artifacts:
1. **SBOM:** SPDX 2.3 format with stable component identities.
2. **Provenance:** SLSA-aligned build traceability.
3. **Vulnerability Linkage:** Current vulnerability status linked to SBOM components.
4. **Evidence Index:** Verifiable index with stable Evidence IDs.

## Standards Mapping
| Requirement | Summit Artifact | Verification Gate |
| ----------- | --------------- | ----------------- |
| Risk-based validation | Evidence Pack | `verify_evidence_pack.sh` |
| Machine-readable SBOM | `summit.spdx.json` | `sbom-lint` |
| Build traceability | `slsa.intoto.jsonl` | `verify-provenance` |
| Contractual SBOM delivery | Release Artifact Pack | CI Release Job |
