# Summit Assurance & Evidence Packs

## Posture: Evidence-Pack-First
Summit has transitioned to an **Evidence-Pack-First** posture in alignment with OMB M-26-05. We prioritize the generation of machine-readable, verifiable evidence over static, universal attestations.

## Evidence Pack Components
An Evidence Pack (`evidence-pack.tgz`) is a deterministic bundle containing:

1. **SBOM**: Machine-readable Software Bill of Materials in SPDX or CycloneDX format.
2. **Provenance**: Verifiable build traceability (SLSA-aligned).
3. **Vulnerability Linkage**: Current vulnerability status linked to SBOM components.
4. **Index**: A stable index file with unique Evidence IDs.

## Workflow
1. **Generation**: CI/CD pipelines generate artifacts on every release or on-demand.
2. **Verification**: `scripts/assurance/verify_evidence_pack.sh` validates the integrity and schema of the pack.
3. **Delivery**: Provided to agencies "upon request" as machine-readable data.

## Relevant Documents
- [OMB M-26-05 Standards Mapping](../standards/omb-m26-05-risk-based-assurance.md)
- [Evidence Pack Schema](../../schemas/assurance/evidence-pack.schema.json)
