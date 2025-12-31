# Runtime Drift Detection

## Overview

"Drift" refers to the phenomenon where a running system deviates from its intended configuration over time. This can happen due to:
*   Manual ad-hoc changes
*   Failed deployments
*   Infrastructure degradation
*   Silent failures in security controls (e.g., policy engine disconnects)

## The Drift Detector

We have a specialized runtime script `server/scripts/detect_runtime_drift.ts` that probes the *live* application to verify that critical controls are active.

### Usage

```bash
# Target localhost (default)
npx tsx server/scripts/detect_runtime_drift.ts

# Target specific environment
API_URL=https://api.staging.intelgraph.io npx tsx server/scripts/detect_runtime_drift.ts
```

### What It Checks

1.  **Authentication Guardrails**:
    *   **Test**: Probes a protected endpoint (`/api/auth/verify-token`) without credentials.
    *   **Pass**: Server returns `401 Unauthorized`.
    *   **Fail**: Server returns `200 OK` (CRITICAL SECURITY FAILURE) or `500 Error`.

2.  **Provenance System Health**:
    *   **Test**: Probes the Provenance Ledger health endpoint (`/api/provenance-beta/health`).
    *   **Pass**: Server returns `200 OK` and `status: 'ok'`.
    *   **Fail**: Any other response indicates the immutable ledger is offline or unreachable.

3.  **Rate Limiting**:
    *   **Test**: Inspects response headers on API requests.
    *   **Pass**: `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers are present.
    *   **Fail**: Headers are missing, implying the rate limit middleware has been disabled or bypassed.

## Response Protocol

If the detector fails:
1.  **Identify the Scope**: Is it a single node or the whole cluster?
2.  **Check Logs**: Look for middleware initialization errors in `server/src/index.ts` logs.
3.  **Redeploy**: If configuration is suspected to be corrupted, trigger a fresh deployment of the last known good image.
