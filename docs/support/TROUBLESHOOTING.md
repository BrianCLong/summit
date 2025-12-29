# MVP-4-GA Troubleshooting Guide

Use this guide to triage customer tickets and escalate with the right evidence. Link any referenced error codes back to the catalog in `docs/support/ERROR_CODES.md`.

## Quick checks

- Confirm environment variables: `EVIDENCE_SIGNING_SECRET`, `WASM_MAX_CPU_MS`, `WASM_MAX_MEM_MB`, `OPA_ENABLED`, and OPA endpoint settings.
- Capture request metadata: GraphQL operation name, tenant ID, user ID, and mission tags sent in the request.
- Note timestamps and trace IDs from application logs to align with infrastructure logs.

## Common issues & remediation

### Receipt signing failures

- **Signal:** `RCPT_SIGNING_SECRET_MISSING` with message `EVIDENCE_SIGNING_SECRET is required to sign receipts`.
- **Where to look:** `server` logs around receipt generation; check deployment environment variables.
- **Collect:** Run ID, receipt ID (if generated), env vars (mask secrets), and recent deploy SHA.

### Plugin execution errors

- **Signal:** `PLUGIN_EXPORT_JSON_MISSING`, `PLUGIN_WASM_TIMEOUT`, or `PLUGIN_WASM_OOM` in plugin output.
- **Where to look:** `server` logs for WASM runner warnings; plugin stdout/stderr; values of `WASM_MAX_CPU_MS` and `WASM_MAX_MEM_MB`.
- **Collect:** Plugin binary hash, input payload sample (sanitized), capability flags (network/fs), and resource utilization if available.

### Compliance drift detection

- **Signal:** `COMPLIANCE_CONTROL_MAP_MISSING` or `COMPLIANCE_ARTIFACT_MISSING` from `scripts/compliance/check_drift.ts`.
- **Where to look:** File tree under `compliance/`; drift check output; recent compliance artifact commits.
- **Collect:** Current `compliance/control-map.yaml`, list of missing artifacts, and the commit SHA where the artifact last existed.

### Authorization and policy decisions

- **Signal:** `AUTHZ_AUTHENTICATION_REQUIRED`, `AUTHZ_POLICY_DENIED`, `AUTHZ_ENGINE_UNAVAILABLE`, or `AUTHZ_POLICY_EVALUATION_FAILED`.
- **Where to look:** GraphQL response extensions (`summitErrorCode`) and `server` authorization logs (OPA request/response, field name, user ID).
- **Collect:** Operation name, user/tenant IDs, OPA input payload (minus sensitive fields), OPA decision log if available, and network connectivity status to OPA.

## What to include when opening a support ticket

- Error code(s) and full message text.
- Timestamp (UTC), region, and deployment identifier.
- Request details: endpoint, operation, parameters, and sanitized payload samples.
- Relevant environment configuration and feature flags (`OPA_ENABLED`, compliance drift scripts run).
- Logs or screenshots showing the failure and any correlated trace IDs.
- Steps to reproduce, including plugin binaries or policies involved.
