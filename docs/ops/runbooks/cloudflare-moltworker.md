# Runbook: Sandboxed Agent Runtime (Cloudflare Moltworker Adapter)

**Status:** Experimental Adapter Runbook

## Scope (Final)

Operational response for the sandboxed agent runtime adapter modeled on Moltworker’s pattern. The adapter is feature-flagged off by default and only enabled in controlled environments.

## Signals

- Elevated runtime cold-start (p95 > 10s).
- Evidence bundle missing or non-deterministic.
- Persistence failures on restart.
- Tool access denied due to policy allowlist gaps.

## Runbook: Runtime Stuck / Cold Start Too Slow

**Immediate Actions**
1. Verify feature flag `FEATURE_SANDBOX_RUNTIME` state.
2. Inspect sandbox runtime logs for dependency or environment errors.
3. Confirm object store reachability and namespace integrity.

**Recovery**
- Restart sandbox runtime container.
- Roll forward by disabling adapter and falling back to default runtime.

**Rollback Trigger**
- p95 cold-start > 12s for 10-minute window.
- Evidence bundle missing required files.

## Runbook: State Store Inconsistency

**Immediate Actions**
1. Verify namespace isolation for the evidence ID.
2. Validate object store write permissions.
3. Check for conflicting writes across runtimes.

**Recovery**
- Rehydrate from last known good evidence bundle.
- Clear corrupted namespace and rerun under gated access.

## Alerts & SLOs

- **Cold start p95:** ≤ 10s (adapter test environment).
- **Per-step overhead (router + policy):** p95 ≤ 200ms (excluding model latency).
- **Memory cap:** ≤ 512MiB (CI/runtime test cap).

## Break Glass Procedure

1. Disable `FEATURE_SANDBOX_RUNTIME`.
2. Purge adapter namespace in object storage.
3. Notify governance owners with evidence bundle reference.

## Evidence Requirements

- Evidence bundle required for each runtime run.
- Deterministic stamp must exclude unstable timestamps.
- Log redaction required for secrets and user content.
