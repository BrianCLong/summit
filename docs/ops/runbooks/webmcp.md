# WebMCP Operations Runbook

## SLO Targets

- p95 normalization latency: <= 500ms per session.
- Memory budget: <= 50MB per session replay process.

## Failure Modes

- Malformed transcript: reject with required-field error.
- Policy rejection >5%: trigger review of origin allowlist and action policies.

## Replay Command

```bash
python scripts/replay/webmcp_replay.py \
  --input tests/fixtures/webmcp/xorigin.json \
  --out-dir evidence/EVD-WEBMCP-MWS-0001 \
  --allow-origin https://allowed.example
```
