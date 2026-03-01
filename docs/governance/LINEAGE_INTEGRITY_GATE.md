# Lineage Integrity Gate

## Purpose
Prevent silent loss, drift, or tampering of lineage/provenance signals by enforcing deterministic lineage artifacts and cross-signal consistency (OpenLineage + OpenTelemetry + evidence bundle).

## Inputs
- evidence/lineage/lineage.stamp.json
- (optional) captured OpenLineage run event JSON (raw, non-deterministic storage allowed)
- (optional) OTEL span export (raw, non-deterministic storage allowed)

## Deterministic Artifacts
- lineage.stamp.json MUST be deterministic:
  - no timestamps
  - stable key ordering during generation
  - stable sorting for dataset arrays

## Acceptance Criteria (MUST)
### A. Stamp Present
- lineage.stamp.json exists
- schema == summit.lineage.stamp.v1

### B. Dataset Canonicalization
- Every dataset has:
  - namespace
  - name
  - dataset_id (sha256(namespace|name))
- namespace MUST be canonical form (lowercase, provider-qualified)
- inputs and outputs MUST be sorted (namespace, name)

### C. Transformation Hash
- transformation.transformation_hash exists
- MUST start with `sha256:`
- MUST be reproducible from canonical transformation object (as defined in docs)

### D. Extraction Error Visibility
- If OpenLineage extractionError facet is present, the gate FAILS.
  Rationale: extraction failures previously resulted in incomplete lineage without explicit signaling; now they are first-class.
  (OpenLineage extraction error facet)

### E. Cross-Signal Consistency (if both available)
- If OTEL trace/span info exists in the stamp:
  - db.system and db.namespace SHOULD align with OTEL semantic conventions.
- If OpenLineage producer exists:
  - producer SHOULD be recorded in stamp
- The transformation_hash recorded in the stamp MUST match:
  - the hash recorded on OTEL span attributes (if emitted)
  - the hash recorded on OpenLineage run facets (if emitted)

### F. Integrity Digest
- integrity.content_digest MUST equal sha256 of the file content with integrity.content_digest removed/null.

## Failure Modes (examples)
- Missing stamp file
- Empty dataset lists without explicit extraction error facet
- Dataset namespace drift (e.g., `Prod.Postgres` vs `prod.postgres`)
- Transformation hash mismatch between OTEL/OpenLineage
- Any extractionError facet present

## Enforcement
- This gate runs as a required CI check on PR and on main merges.
- Gate output MUST include:
  - counts of inputs/outputs
  - any canonicalization corrections attempted
  - explicit list of mismatches

## Non-Goals
- The gate does not validate the correctness of the transformation itself.
- The gate does not require client-side parsing of db.statement solely to infer table names.
