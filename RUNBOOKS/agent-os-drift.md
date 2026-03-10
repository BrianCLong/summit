# Agent OS Drift Sentinel Runbook

## Description
This runbook triggers when \`agent-os-drift.yml\` fails.

## Diagnostics
1. Check missing files.
2. Ensure the \`.summit\` state directory exists.

## Remediation
1. Re-initialize summit configurations via \`summit init\`.
2. Inspect \`agent-os-drift.sh\` logs.
