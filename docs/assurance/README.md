# Software Assurance Evidence Packs

## Overview
In accordance with OMB M-26-05, Summit provides "Assurance Evidence Packs" for risk-based procurement diligence. These packs contain machine-readable evidence of software security, provenance, and vulnerability status.

## Contents
- `sbom/`: SPDX 2.3 JSON manifests.
- `provenance/`: SLSA build attestations and digests.
- `vuln/`: Linked vulnerability scan results.
- `index.json`: Root evidence index with stable Evidence IDs.

## Usage for Diligence
Vendors or agency reviewers can use the `verify_evidence_pack.sh` script to validate the integrity and completeness of a pack against the defined schema.

```bash
./scripts/assurance/verify_evidence_pack.sh dist/assurance/evidence-pack.tgz
```

## Generation in CI
The evidence pack is generated on every release and can be triggered on-demand via the "Assurance Evidence Generation" workflow.
