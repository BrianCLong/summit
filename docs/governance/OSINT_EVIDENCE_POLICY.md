**Owner**: @intelgraph/provenance-team
**Last-Reviewed**: 2026-01-27
**Evidence-IDs**: EVID-GOV-OSINT-POLICY-001
**Status**: active
**ILSA-Level**: 5
**IBOM-Verified**: true

# OSINT Evidence & Governance Policy

## 1. Purpose

This policy defines the mandatory standards for the collection, preservation, and attribution of Open Source Intelligence (OSINT) within the Summit Intelligence Foundry. It ensures that all OSINT-derived insights meet the cryptographic and procedural requirements for legal, audit, and mission-critical use cases.

## 2. Mandatory Headers

All OSINT documentation and evidence artifacts MUST contain the following headers:

- **Owner**: The DRI (Directly Responsible Individual) or Team.
- **Last-Reviewed**: ISO 8601 date of the last verification.
- **Evidence-IDs**: A comma-separated list of valid Summit Evidence IDs.
- **Status**: The current state of the intelligence (e.g., DRAFT, VERIFIED, EXPIRED).
- **ILSA-Level**: Intelligence Level for Source Attribution (1-5).
- **IBOM-Verified**: Boolean indicating if the Intelligence Bill of Materials is verified.

## 3. The "No-Provenance" Veto

No data shall be ingested into the `IntelGraph` without a verifiable lineage trace.
- Automated agents MUST refuse ingestion if `source_id` is missing.
- Enrichment services MUST flag any node lacking an upstream `Evidence-ID` as `UNVERIFIED_ARTIFACT`.

## 4. Chain of Custody (Cryptographic)

1. **At Collection**: The `OSINTCollector` agent signs the raw payload and mints an `Evidence-ID`.
2. **At Ingestion**: The `ProvenanceGateway` records the ingestion event, binding the raw payload hash to the `Evidence-ID`.
3. **At Enrichment**: Any transformation or entity resolution must emit a `ProvenanceEvent` linking the new graph state to the original `Evidence-ID`.
4. **At Reporting**: The final intelligence report MUST be accompanied by an `EvidenceBundle` containing the full trace from collection to conclusion.

## 5. ILSA Compliance Levels

| Level | Description | Requirement |
| :--- | :--- | :--- |
| **1** | Anonymous / Unverified | Source is unknown or unverified. High risk. |
| **2** | Known Source / Low Confidence | Source is identified but reliability is low. |
| **3** | Verified Source / Moderate Confidence | Source and collection method are verified. |
| **4** | High Confidence / Multi-Source | Verified source with cross-correlation from multiple streams. |
| **5** | Absolute / Deterministic | Source is authenticated; payload is cryptographically signed at origin. |

## 6. Enforcement (CI/CD)

- The `verify-osint-evidence` CI gate executes on every pull request affecting `docs/osint/` or `agents/osint/`.
- Failure to meet header requirements or schema validation results in a hard build failure.
