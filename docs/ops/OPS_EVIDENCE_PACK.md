# Ops Evidence Pack

The Ops Evidence Pack is a deterministic, audit-friendly tarball containing the outputs of the unified Ops Verify gate (`verify_ops`). It serves as a comprehensive record of operational verification for a specific commit.

## Purpose

- **Auditability**: Provides a snapshot of verification status, logs, and artifacts.
- **Troubleshooting**: Captures stdout/stderr and artifact outputs for offline analysis.
- **Compliance**: Can be archived as evidence of operational readiness.

## Contents

The pack is a tarball (`.tar.gz`) containing a directory named `<UTC_YYYYMMDDTHHMMSSZ>_<shortsha>/` with the following structure:

- **METADATA.json**: Contains commit SHA, branch, timestamp, repo URL, and tool versions (node, pnpm, docker).
- **LOGS/**:
  - `verify_ops.stdout.log`: Standard output from the verification script.
  - `verify_ops.stderr.log`: Standard error from the verification script.
- **ARTIFACTS/**: Captured artifacts from validators (e.g., plans, JSON reports).
- **MANIFEST.json**: SHA256 checksums of all files in the pack.
- **SUMMARY.md**: High-level pass/fail result and pointers to logs.

## Usage

### Generating Locally

To generate an evidence pack locally:

\`\`\`bash
./scripts/verification/generate_ops_evidence_pack.sh
\`\`\`

The output will be located in `artifacts/ops-evidence/`.

### Interpreting Failures

If the verification fails, the script will exit with a non-zero status, but the evidence pack will still be generated.
Check `SUMMARY.md` in the pack to see the result and pointers to relevant logs.

## Storage and Retention

Evidence packs should be retained according to the project's data retention policy. For CI generated packs, they are uploaded as workflow artifacts.

## Rollback

This feature adds new scripts and docs. To rollback, delete:

- `scripts/verification/generate_ops_evidence_pack.sh`
- `docs/ops/OPS_EVIDENCE_PACK.md`
- `.github/workflows/generate-ops-evidence-pack.yml`
