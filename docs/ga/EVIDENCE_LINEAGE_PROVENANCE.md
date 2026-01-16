# W3C PROV-O Lineage Evidence

## Purpose
This document certifies that the Summit build pipeline produces machine-verifiable W3C PROV-O (JSON) lineage data for all release artifacts.

## Artifact Location
- **Path**: `artifacts/provenance/summit.prov.json`
- **Schema**: `packages/provenance-exporter/schemas/prov.schema.json`

## Provenance Model
The generated PROV-JSON follows the W3C PROV-O standard, mapping Summit concepts as follows:

### Entities (`prov:Entity`)
- **Summit Artifacts**: Build outputs, reports, and binaries.
- **Attributes**:
    - `summit:sha256`: Cryptographic hash of the artifact content.
    - `prov:type`: "summit:Artifact".

### Activities (`prov:Activity`)
- **CI Run**: The GitHub Actions workflow execution.
- **Attributes**:
    - `summit:runId`: The GitHub Run ID.
    - `prov:startTime` / `prov:endTime`.

### Agents (`prov:Agent`)
- **CI Actor**: The GitHub user or service account initiating the build.
- **Attributes**:
    - `prov:label`: The GitHub Actor username.

## Verification
To verify the provenance bundle:
1. Ensure `summit.prov.json` is present.
2. Validate against `prov.schema.json`.
3. Verify that the `summit:sha256` of listed entities matches the actual file artifacts.
