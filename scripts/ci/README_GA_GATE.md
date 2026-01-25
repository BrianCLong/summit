# GA Core Gate Support Scripts

This directory contains Node.js scripts used by the `ci-core-gate` workflow to enforce security and supply chain integrity.

## Scripts Overview

| Script | Purpose |
| --- | --- |
| `build_deploy_gate_input.mjs` | Aggregates artifacts and signatures into a JSON input for OPA. |
| `enforce_opa_allow.mjs` | Parses OPA decision results and fails if the policy does not allow. |
| `enforce_trivy_threshold.mjs` | Scans Trivy JSON results and fails if critical vulnerabilities exceed the threshold. |
| `generate_ga_evidence_manifest.mjs` | Generates a `manifest.json` for the evidence bundle, including hashes. |
| `generate_slsa_provenance.mjs` | Generates SLSA v1 statement for build subjects. |
| `verify_threat_model_evidence.mjs` | Verifies that all evidence items defined in the threat model are present. |
| `write_sha256_sums.mjs` | Writes a standard `bundle.sha256` file for all artifacts in a directory. |

## Usage in CI

These scripts are designed to be run within the GitHub Actions environment. They utilize Sigstore/Cosign for signing and verification, and OPA for policy enforcement.

## Local Testing

Most scripts can be tested locally by providing mock data:

```bash
node scripts/ci/enforce_trivy_threshold.mjs --in report.json --max-critical 0
```
