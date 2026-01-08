# Governance Evidence Pack Runbook

## Overview

The Governance Evidence Pack is a unified, deterministic archive containing all necessary artifacts for auditing a release. It consolidates:
- Release Evidence (CI artifacts, SBOMs, test results)
- Policy Bundle (OPA policies)
- Field Evidence (Offline readiness)
- Approvals (Promotion decisions)

## Directory Structure

```text
dist/governance-evidence/<id>/
├── index.json          # Canonical manifest of all contents
├── index.md            # Human-readable summary
├── release/            # Release evidence bundle
├── field/              # Field evidence (offline bundle)
├── policy/             # Policy bundle
├── approvals/          # Approval gates
├── ci/                 # CI logs/summaries
├── hashes/             # Checksums for integrity verification
└── bundle/             # Tarball of the pack
```

## How to Verify (Offline)

You can verify the integrity and completeness of a governance pack using the provided verification script. This does not require internet access.

### Command

```bash
./scripts/verification/verify_governance_evidence_pack.ts --pack <path_to_pack_directory_or_tarball>
```

### Output

The command outputs a JSON report to stdout and to `<pack_dir>/verification/governance-verify.json`.

**Example Output:**

```json
{
  "pass": true,
  "component_statuses": {
    "integrity": "PASS",
    "release_evidence": "PASS",
    "policy_bundle": "PASS",
    "field_evidence": "PASS"
  },
  "blocking_reasons": [],
  "remediation": []
}
```

### Reason Codes

- `CHECKSUM_MISMATCH`: The file content does not match the recorded checksum. Potential tampering.
- `MISSING_RELEASE_EVIDENCE`: The `release/` directory or its manifest is missing.
- `RELEASE_EVIDENCE_INCOMPLETE`: The release evidence summary indicates criteria were not met.
- `MISSING_POLICY_BUNDLE`: The `policy/` directory is empty or missing.

## CI Artifacts

The pack is generated on every tag build and uploaded as a GitHub Actions artifact named `governance-evidence-pack`. Retention is set to 90 days.
