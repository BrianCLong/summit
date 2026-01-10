# SLSA Provenance Requirements

## Required Provenance Metadata

- Builder identity and environment
- Source repository and commit
- Build parameters and time
- Artifact hashes and signatures

## Validation Steps

1. Verify attestation signature and chain.
2. Match artifact hash to package measurement.
3. Record provenance digest in transparency log.

## Evidence Artifacts

- SLSA provenance JSON
- Attestation signature verification logs
- Transparency log digest
