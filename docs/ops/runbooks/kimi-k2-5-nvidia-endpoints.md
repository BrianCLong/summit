# Runbook: Kimi K2.5 on NVIDIA Integrate Endpoints

## Purpose
Operational guidance for the NVIDIA-hosted Kimi K2.5 endpoint in Summit.

## Preconditions
- FEATURE_NVIDIA_INTEGRATE=1
- NVIDIA_INTEGRATE_API_ALLOW=1
- Allowlist includes integrate.api.nvidia.com
- NVIDIA_API_KEY configured via secret manager or environment.

## Configuration Checklist
- Feature flags default to OFF in production until enablement approval.
- Deny-by-default outbound policy enforced.
- Redaction enabled for request/response logging.
- Budget limits configured for token usage and concurrency.

## Failure Modes
- 401/403: Invalid or missing API key.
- 429: Rate limit exceeded.
- 5xx: Provider outage or transient failure.
- Stream truncation: partial chunks or premature termination.
- Tool-call schema errors: invalid tool definitions or malformed responses.

## Diagnostics
- Verify allowlist and NVIDIA_INTEGRATE_API_ALLOW.
- Confirm API key is present and not expired.
- Check provider error codes and retry policy thresholds.
- Validate streaming parser event sequence for determinism.

## Observability
- Metrics: request count, error rate, latency p50/p95, token usage.
- Alerts:
  - Error rate > 2% over 5 minutes.
  - p95 latency > 6s over 5 minutes.
  - Budget threshold warnings.

## Rollback Plan
1. Disable FEATURE_NVIDIA_INTEGRATE.
2. Remove allowlist entry for integrate.api.nvidia.com.
3. Rotate NVIDIA_API_KEY if compromise is suspected.

## References
- docs/standards/kimi-k2-5-nvidia-endpoints.md
- docs/security/data-handling/kimi-k2-5-nvidia-endpoints.md
