# Drift Detection: IP Capture

## Purpose
Ensures that the IP Capture pipeline produces deterministic outputs for a canonical input.

## How it works
The script \`scripts/monitoring/forbes-ip-prompts-2026-02-09-drift.py\` runs the pipeline on a fixture and compares the SHA256 hash of \`report.json\` against a hardcoded baseline.

## Usage
\`\`\`bash
python scripts/monitoring/forbes-ip-prompts-2026-02-09-drift.py fixtures/ip_capture/sample.md out/drift
\`\`\`

## Handling Failures
If the script fails with "DRIFT DETECTED":
1. Check if the pipeline logic changed intentionally.
2. If yes, update the \`EXPECTED_REPORT_HASH\` in the script.
3. If no, investigate why output changed (regression).
