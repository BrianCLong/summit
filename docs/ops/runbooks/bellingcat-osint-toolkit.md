# Runbook: Bellingcat OSINT Toolkit MWS

## Execute Locally

1. Ensure fixtures exist under `fixtures/mws_case1/input`.
2. Run workflow execution through `src/workflows/runner.ts` entrypoints from tests or scripts.
3. Validate generated evidence files in `artifacts/runs/<EVID>/`.

## Policy Troubleshooting

- If a step is unexpectedly blocked, inspect:
  - `policy.network`
  - `policy.connectors.allowlist`
  - step `mode` (`live` vs `offline_fixture`)

## Drift Monitoring

Run `scripts/monitoring/bellingcat-osint-toolkit-drift.ts` to verify toolkit URL availability and schema-compliant drift output in `artifacts/drift/bellingcat/latest.json`.
