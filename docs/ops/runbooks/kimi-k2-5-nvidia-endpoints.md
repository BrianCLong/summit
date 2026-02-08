# Runbook: Kimi K2.5 via NVIDIA Integrate Endpoints

## Purpose

Operational guidance for enabling and monitoring the NVIDIA-hosted Kimi K2.5
chat-completions endpoint in Summit.

## Configuration Checklist

- `FEATURE_NVIDIA_INTEGRATE=0` default, enable only in approved environments.
- `FEATURE_KIMI_THINKING=0` default, enable only for validated use cases.
- `NVIDIA_API_KEY` stored in secret manager, never in `.env` committed files.
- Outbound allowlist includes `integrate.api.nvidia.com`.

## Failure Modes & Responses

| Symptom | Likely Cause | Response |
| --- | --- | --- |
| 401/403 | Invalid or missing API key | Rotate key, verify secret mount. |
| 429 | Rate limit | Backoff, reduce concurrency, review quotas. |
| 5xx | Upstream outage | Retry with jitter; fail over if available. |
| Stream truncation | Network/timeout | Reduce chunk timeout; inspect proxy limits. |
| Tool-call malformed | Schema mismatch | Reject tool and log validation error. |

## Alerts (Baseline)

- Error rate > 2% in 5 minutes
- p95 latency exceeds 6 seconds
- Budget cap warnings or token usage spikes

## Rollback Plan

- Disable `FEATURE_NVIDIA_INTEGRATE` and `FEATURE_KIMI_THINKING`.
- Verify no active requests in flight.
- Revert recent configuration changes in the flag service.

## Evidence Artifacts

- `artifacts/nvidia-kimi-k2_5/metrics.json`
- `artifacts/nvidia-kimi-k2_5/report.json`
- `artifacts/nvidia-kimi-k2_5/stamp.json`
