# Offline-Local Runbook

## Model Install
1. Install and launch LM Studio (or another OpenAI-compatible local host).
2. Start the local server on `http://localhost:1234/v1`.
3. Confirm the selected model is loaded and warm.

## Health Check
- Endpoint: `GET http://localhost:1234/v1/models`
- Expected: HTTP 200 and a non-empty model list.

## Runtime Execution
- Use profile: `offline-local`
- Expected artifacts:
  - `report.json`
  - `metrics.json`
  - `stamp.json`

## Recovery
1. Restart local host process.
2. Re-verify `/v1/models`.
3. Re-run offline profile check and determinism stamp generation.

## Drift Remediation
1. Run weekly drift monitor.
2. If drift is detected, pin model version and regenerate expected hash after review.
