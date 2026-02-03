# Runbook: Kimi K2.5

## Configuration

### Environment Variables
*   `MOONSHOT_API_KEY`: API Key for Moonshot platform.
*   `MOONSHOT_BASE_URL`: Defaults to `https://api.moonshot.cn/v1`.
*   `TOGETHER_API_KEY`: API Key for Together AI (optional).
*   `TOGETHER_BASE_URL`: Defaults to `https://api.together.xyz/v1`.
*   `FEATURE_TOGETHER_KIMI`: Set to `true` to enable Together provider.

## Health Checks
1.  **Chat Ping**: Simple "hello" message.
2.  **Tool Call Ping**: Request that forces a simple tool call (e.g., `get_weather`).

## Troubleshooting

### Rate Limiting
*   If `429` errors occur, exponential backoff is implemented.
*   Check usage quotas on Moonshot/Together dashboard.

### Drift Detection
*   A nightly job runs `scripts/monitoring/kimi-k2-5-drift.py`.
*   Check `artifacts/kimi-k2-5/drift/metrics.json` for degradation.
*   **Alert**: If `tool_call_f1` < 0.9, investigate schema changes or model degradation.

### Incident Playbook
*   **Spike in Failures**: Disable provider flag. Fallback to other models.
*   **Security Incident**: Rotate keys immediately.
