# Logging Runbook

## Purpose
Operational checklist for verifying structured logging, redaction, and trace correlation across Summit services.

## Preconditions
- Services deployed with `@intelgraph/logging` and OpenTelemetry tracing enabled.
- Log collectors subscribed to stdout for every container.

## Validation steps
1. **Smoke log emission**
   - Trigger a request against a service (e.g., `curl /healthz`).
   - Confirm a JSON log entry containing `traceId`, `spanId`, `correlationId`, and `service` appears in stdout.
2. **Redaction**
   - Send a request with an `Authorization` header and a dummy `password` field.
   - Verify the emitted log omits/redacts those fields (`undefined` or absent in the JSON payload).
3. **Sampling**
   - For components marked noisy, check `sampleRates` in configuration (e.g., `LOG_DEBUG_SAMPLE_RATE`).
   - Ensure debug logs respect the sampling budget by comparing request volume to emitted debug count.
4. **Trace correlation**
   - Ingest logs into the observability stack and search by `traceId`; ensure matching spans exist in the trace backend.
   - Validate `correlationId`/`requestId` headers propagate end-to-end via `requestContextMiddleware`.
5. **Policy enforcement path**
   - Exercise allow/deny decisions. Confirm structured entries land under component `policy-enforcer` with provenance metadata and no plaintext secrets.

## Triage and rollback
- If logging fails hard or blocks requests, temporarily set `LOG_LEVEL=warn` to reduce noise and disable sampling overrides.
- To roll back to the prior logger quickly, pin the previous container image tag and capture logs for RCA before redeployment.
- Use the codemod `tools/codemods/replace-console-with-logger.js` to eliminate any regression to `console.*` usage before redeploying.

## Ownership
- **Primary**: Observability/Platform team
- **Secondary**: Service owners consuming `@intelgraph/logging`
