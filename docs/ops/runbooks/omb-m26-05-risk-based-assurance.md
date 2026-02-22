# Runbook: OMB M-26-05 Risk-Based Assurance

## Overview
This runbook describes how to manage the evidence pack generation and verification for federal procurement requests.

## Manual Generation
To generate an evidence pack locally:
```bash
./scripts/assurance/build_evidence_pack.sh
```
The output will be at `dist/assurance/evidence-pack.tgz`.

## Manual Verification
To verify an existing pack:
```bash
./scripts/assurance/verify_evidence_pack.sh path/to/evidence-pack.tgz
```

## CI/CD Workflow
The pack is automatically generated on releases via `.github/workflows/assurance-sbom.yml` and related workflows.

## Troubleshooting
### Hash Mismatch
If `verify_evidence_pack.sh` fails with a hash mismatch:
1. Ensure artifacts haven't been modified after the index was built.
2. Re-run `build_evidence_pack.sh` to refresh the index.

### Missing Artifacts
Ensure `generate_sbom.sh` and `generate_provenance.sh` completed successfully before building the pack.
