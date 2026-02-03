# Runbook: SERA CLI Proxy

## Purpose

Run the Summit SERA CLI-style proxy for OpenAI-compatible vLLM endpoints with policy gating and
deterministic evidence artifacts.

## Start Proxy

```bash
summit sera-proxy start \
  --endpoint http://localhost:8000/v1/chat/completions \
  --api-key "$SERA_API_KEY" \
  --model allenai/SERA-8B \
  --port 18080
```

Environment variables (optional):

- `SERA_ENDPOINT`
- `SERA_API_KEY`
- `SERA_MODEL`
- `SERA_PORT`
- `SERA_ALLOW_HOSTS`
- `SERA_ARTIFACT_DIR`

## Health Check

```bash
curl http://localhost:18080/healthz
```

## Common Failures

| Symptom | Likely Cause | Remediation |
| --- | --- | --- |
| 401/403 from upstream | Invalid or missing API key | Verify `SERA_API_KEY` and endpoint auth settings. |
| 404 from proxy | Incorrect path | Ensure client uses `/v1/chat/completions`. |
| 502 from proxy | Upstream unreachable | Verify endpoint URL and service availability. |
| Allowlist error on start | Host not allowed | Set `--allow-host` or `SERA_ALLOW_HOSTS`. |

## Evidence Artifacts

Artifacts are written to `artifacts/sera_proxy/` by default:

- `report.json`
- `metrics.json`
- `stamp.json`

## Suggested Alerts

- Upstream error rate > 5% (5m).
- Proxy request latency p95 > 25ms on localhost.
- Blocked request count > 0 (investigate SSRF or size limits).
