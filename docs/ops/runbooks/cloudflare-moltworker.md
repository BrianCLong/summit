# Runbook: Sandboxed Agent Runtime + Edge Router (Cloudflare Moltworker Reference)

## Status

Experimental. Feature-flagged, default OFF.

## Readiness Assertion

All operations must align with the Summit Readiness Assertion and governance standards.

## Scope

Operations for the sandboxed agent runtime adapter, including cold-start delays, state store inconsistencies, and safe disablement.

## Preconditions

- Feature flag enablement is documented and approved.
- Policy bundle deployed and verified.
- Evidence bundle pipeline available and validated.

## Alerts

- Runtime cold-start latency p95 > 10s (adapter test env).
- Evidence bundle missing for any run.
- Policy decision failures > threshold.

## Incident: Runtime stuck / cold start too slow

**Symptoms**
- Sandbox runtime does not respond within policy timeout.
- Edge router returns timeout errors.

**Immediate Actions**
1. Confirm feature flags and policy bundle are active.
2. Check object store connectivity and latency.
3. Trigger runtime restart with state restoration.

**Resolution**
- If cold-start remains > budget, disable adapter and fail over to non-sandbox runtime.

**Post-Incident**
- Capture evidence bundle with failure metrics.
- File drift report if runtime or policy versions changed.

## Incident: State store inconsistency

**Symptoms**
- Agent state missing after restart.
- Evidence bundle references missing state keys.

**Immediate Actions**
1. Validate object store namespace for the run.
2. Inspect policy logs for deny/allow mismatches.
3. Restore from last valid evidence bundle if available.

**Resolution**
- Re-run the job with a new namespace and ensure policy allows required store access.

## Break Glass

- Disable FEATURE_SANDBOX_RUNTIME and adapter-specific flags.
- Purge state namespace for affected runs.
- Record a governed exception if normal gates were bypassed for recovery.

## Metrics to Watch

- Runtime cold-start p95
- Step overhead p95 (router + policy)
- Evidence bundle completion rate
- Policy deny/allow ratio

## Rollback

- Restore previous adapter version.
- Revert policy changes to last known-good hash.
- Verify evidence bundle schema compatibility.
