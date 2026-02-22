# OMB M-26-05: Risk-Based Assurance Standard

## Overview
This document maps OMB Memorandum M-26-05 (Jan 23, 2026) to the Summit engineering and assurance posture.

## Core Policy Shift
OMB M-26-05 rescinds M-22-18 and M-23-16, moving away from a universal, standardized self-attestation form toward **agency-specific, risk-based assurance**.

### Key Principles
1. **No Universal Method**: "There is no universal, one-size-fits-all method of achieving that result." (ITEM:CLAIM-01)
2. **Rescission of M-22-18/M-23-16**: "OMB Memoranda M-22-18 and M-23-16... are hereby rescinded." (ITEM:CLAIM-02)
3. **Risk-Based Validation**: "Each agency should validate provider security ... based on a comprehensive risk assessment." (ITEM:CLAIM-03)
4. **SBOM on Request**: "Agencies may also choose to adopt contractual terms that require a software producer to provide a current software bill of materials (SBOM) upon request." (ITEM:CLAIM-04)

## Summit Implementation Mapping

| Planned element in Summit | Grounding |
| ------------------------- | --------- |
| Replace “attestation-first” posture with “evidence-pack-first” posture | ITEM:CLAIM-01/03/05 |
| Support “SBOM upon request” delivery + update expectations | ITEM:CLAIM-04 |
| Machine-readable SBOM outputs (SPDX/CycloneDX) + automation-friendly CI | ITEM:CLAIM-06 |
| SBOM “quality + context” (hashes/licenses/tool metadata) | ITEM:CLAIM-07 |
| Provenance / build traceability artifacts | Aligned to ITEM:CLAIM-03 |
| Evidence bundle format (vendor audit pack) | Aligned to ITEM:CLAIM-03 |

## Data Classification & Retention
- **Classification**: "Controlled – Vendor Deliverable"
- **Retention**: Follows standard CI/CD artifact retention policy.
- **Privacy**: Never log secrets, internal URLs, or customer identifiers in evidence packs.
