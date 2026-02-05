# OpenAI Frontier Operational Runbook

## Feature Flags
*   `FRONTIER_ENABLED`: Enable/Disable the entire module. Default: `False`.
*   `FRONTIER_MOCK_MODE`: Use Mock CRM/Ticketing instead of live connectors. Default: `True`.

## Monitoring & Alerts
*   **Drift Detection:** `scripts/monitoring/openai-frontier-drift.py` runs daily.
*   **Alerts:**
    *   `FrontierPolicyDenialSpike`: > 10 denials/min.
    *   `FrontierEvalScoreDrop`: > 5% drop in MWS score.

## Troubleshooting

### Policy Denials
1.  Check `audit.json` for `tool_name` and `user_identity`.
2.  Verify `AgentIdentity.allowed_tools` in configuration.
3.  If legitimate, update policy via PR (requires review).

### Eval Failures
1.  Run `pytest summit/tests/frontier/mws/test_mws_frontier.py` locally.
2.  Inspect `artifacts/mws_frontier/report.json` (if enabled) for failure step.
3.  Check for changes in Mock Providers or Logic.

## Rotation
*   Context Provider Credentials should be rotated every 90 days (managed by Vault).
