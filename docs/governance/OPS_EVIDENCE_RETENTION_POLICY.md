Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Ops Evidence Retention Policy

**Scope**: Weekly ops evidence packs, release-adjunct packs, and export receipts.
**Out of Scope**: SLSA provenance, SBOM signing, and supply chain integrity artifacts (governed by [Supply Chain Policy](../governance/PROVENANCE_ARCHITECTURE.md)).

## 1. Purpose and Scope

This policy defines the retention, access control, and export cadence for "Ops Evidence Packs"—collections of artifacts demonstrating the operational state, compliance, and release integrity of the platform. It ensures that evidence is available for governance reviews, audits, and incident investigations while maintaining compliance with data privacy and storage cost constraints.

This policy applies to:

- **Weekly Ops Evidence Packs**: Snapshots of operational health (SLIs, alerts, incident logs).
- **Release-Adjunct Packs**: Operational data associated with specific software releases.
- **Export Receipts**: Proof of long-term storage archival.

## 2. Definitions

| Term                      | Definition                                                                                                                                            |
| :------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Evidence Pack**         | A cryptographically verifiable archive (e.g., `.tar.gz`) containing operational artifacts, logs, and metadata.                                        |
| **Evidence Index**        | A centralized registry (e.g., `provenance-ledger`) recording the existence, location, and checksum of all generated packs.                            |
| **Export Receipt**        | A verifiable record confirming that an Evidence Pack has been successfully transferred to immutable long-term storage (e.g., WORM compliance bucket). |
| **Retention Window**      | The mandatory duration for which an artifact must be preserved and accessible.                                                                        |
| **Protected Environment** | An isolated storage environment with restricted access, used for long-term retention of evidence.                                                     |

## 3. Retention Requirements

| Artifact Type                | Retention Window | Justification                                                                                                                                       |
| :--------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow Artifacts**       | 90 days          | Supports short-term debugging and post-deployment verification. Aligns with `Telemetry` class in [Data Retention Policy](data-retention-policy.md). |
| **Weekly Ops Packs**         | 1 year           | Supports quarterly governance reviews, annual audits, and year-over-year operational trend analysis.                                                |
| **Release-Adjunct Packs**    | 3 years          | Matches the `Operational` class retention for case entities. Ensures availability for the lifecycle of major versions.                              |
| **External Storage Exports** | 7 years          | Matches the `Audit` class retention. Required for legal hold and long-term compliance verification.                                                 |

## 4. Cadence

| Event Type   | Trigger                      | Label Format                  |
| :----------- | :--------------------------- | :---------------------------- |
| **Weekly**   | Scheduled (Monday 00:00 UTC) | `YYYY-Www` (e.g., `2024-W40`) |
| **Release**  | On Release Tag Creation      | `vX.Y.Z` (e.g., `v2.1.0`)     |
| **Incident** | On Incident Closure          | `INC-{ID}` (e.g., `INC-123`)  |

## 5. Storage Locations and Naming

All Evidence Packs must follow a canonical naming convention to ensure discoverability.

- **Naming Convention**: `ops-evidence-{LABEL}-{TIMESTAMP}.tar.gz`
  - Example: `ops-evidence-2024-W40-1727654400.tar.gz`
  - Example: `release-evidence-v2.1.0-1727654400.tar.gz`

- **Required Metadata**: Every pack must contain a `manifest.json` file at the root, including:
  - `sha256`: Checksum of the pack contents.
  - `timestamp`: ISO 8601 creation time.
  - `tool_versions`: Versions of tools used to generate the pack (e.g., `ops-cli v1.2.0`).
  - `manifest`: List of all files included in the pack.

## 6. Access Controls

Access to generate and retrieve evidence packs is strictly controlled.

- **Generation**: Restricted to the CI/CD Service Account. Credentials for signing and uploading must be stored in the platform Secrets Manager and never exposed in PR contexts.
- **Export**: Restricted to Compliance Officers and Administrators via the Protected Environment.
- **Audit**: All generation, access, and export events must be logged to the `audit_events` table. The Evidence Index must capture the CI/CD workflow run URL for every generated pack.

## 7. Integrity and Verification

To ensure non-repudiation and tamper evidence:

1.  **Checksums**: A SHA-256 checksum must be generated for every Evidence Pack upon creation.
2.  **Manifest**: The `manifest.json` within the pack must list all contained files and their individual checksums.
3.  **Verification Procedure**:
    - Retrieve the pack and its recorded checksum from the Evidence Index.
    - Run `sha256sum -c checksums.txt` (or equivalent) against the downloaded archive.
    - Verify the calculated checksum matches the record in the Evidence Index.

## 8. Deletion and Exception Process

- **Deletion**: Automated purge jobs remove artifacts after their Retention Window expires.
- **Exceptions**: Any deviation from this policy (e.g., early deletion, extended retention for legal hold) requires written approval from Legal or Compliance.
- **Documentation**: Exceptions must be logged in the `EXCEPTION_REGISTER.md` and noted in the Evidence Index against the specific artifact.

## 9. Ownership and Review

- **Policy Owner**: Head of Platform Engineering / CISO
- **Review Cadence**: Quarterly
- **Change Control**: Modifications to this policy require Pull Request approval from the Policy Owner and the Compliance team.
