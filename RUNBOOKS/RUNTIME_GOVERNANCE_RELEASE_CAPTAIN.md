# Release Captain Runbook: Runtime Governance Enforcement

**Status:** Draft
**Owner:** Runtime Governance Squad
**Last Updated:** 2025-10-27

This runbook guides the Release Captain through the integration, activation, and verification of Runtime Governance Enforcement features. It ensures GA-grade quality without disrupting the Golden Path.

## 1. Integration Sequence

This sequence ensures safe merging of governance components. Verify each step before proceeding.

### Phase 1: Core Logic & Middleware (Zero Runtime Impact)
*   **Merge:** `feat: governance-core` (Verdict Engine, Types)
*   **Merge:** `feat: tenant-guard` (TenantIsolationGuard - logic only)
*   **Merge:** `feat: safety-middleware` (SafetyMode, KillSwitch - logic only)
*   **Verify:**
    *   CI passes: `make test`
    *   No runtime changes (middleware not yet wired).

### Phase 2: Wiring & Enforcement (Feature Flagged)
*   **Merge:** `feat: wire-middleware` (Attach middleware to routes)
    *   *Note:* Ensure flags `platform.kill-switch.global` and `platform.safe-mode` are `false` by default.
*   **Verify:**
    *   Deploy to Staging.
    *   Run `make smoke`.
    *   Manually test that normal traffic is **unaffected**.

### Phase 3: CI Gates & Artifacts
*   **Merge:** `ci: ga-gate` (`.github/workflows/ga-gate.yml`, `scripts/ga-gate.sh`)
*   **Verify:**
    *   Observe "GA Readiness Gate" job in GitHub Actions.
    *   Ensure it runs `make ga` and uploads `artifacts/ga/`.
    *   Job should be green but **optional** initially.

## 2. Required-Check Activation Plan

Do not block merges until stability is proven.

### Check: `GA Readiness Gate`
*   **Job Name:** `ga-gate` (in `.github/workflows/ga-gate.yml`)
*   **Command:** `make ga` -> `scripts/ga-gate.sh`
*   **Artifacts:** `artifacts/ga/ga_report.json`, `artifacts/ga/ga_snapshot.json`

#### Activation Criteria
1.  [ ] **Stability:** Job has passed 3 consecutive runs on `main` without flakes.
2.  [ ] **Performance:** Execution time is < 5 minutes (P95).
3.  [ ] **Accuracy:** No false positives in "Deep Health Check" or "Security Check".

#### Promotion Steps
1.  Navigate to Repository Settings -> Branch Protection -> `main`.
2.  Search for `ga-gate` (or the exact job name from CI logs).
3.  Check "Require status checks to pass".
4.  Announce to `#engineering` that GA Gate is now required.

#### Handling Flakes
*   If `ga-gate` flakes > 10% of the time, revert "Required" status immediately.
*   Investigate `wait_for_ready` timeout in `scripts/ga-gate.sh`.

## 3. Evidence Completeness Checklist

For a given SHA on `main`, verify the following artifacts exist and are valid.

**Path:** `artifacts/ga/` (from `ga-gate` job)
*   [ ] `ga_report.json` exists.
*   [ ] `ga_report.json` -> `status` is `"PASS"`.
*   [ ] `ga_snapshot.json` exists and contains valid phase info.

**Runtime Evidence (if running `make ga-verify`)**
*   [ ] `artifacts/governance/runtime/boot_snapshot.json` (if generated)
*   [ ] `artifacts/governance/runtime/conformance_report.json`

**Governance Verdicts**
*   [ ] Inspect logs for `GovernanceVerdict` entries (grep for `"verdictId"`).

## 4. Smoke Test & Verification Commands

Execute these locally or in a CI shell to verify system health.

### Standard Verification
```bash
# Full GA Gate (Lint, Clean, Up, Health, Smoke, Security)
make ga

# Deterministic Verification Sweep
make ga-verify

# Ops & Observability Verification
make ops-verify
```

### Runtime Smoke Tests
```bash
# Basic Connectivity
make smoke

# Tenant Isolation Test (Expect 403/404 if tenant missing/invalid)
curl -v -H "x-tenant-id: invalid-tenant" http://localhost:8080/api/v1/health

# Kill Switch Test (Mock)
# Requires enabling kill switch via env/flag first
curl -v -X POST http://localhost:8080/api/some-resource
# Expect: 503 Service Unavailable
```

## 5. Rollback & Incident Response

### Failure Mode: Tenant Isolation Blocks Legitimate Traffic
*   **Symptom:** 403 Forbidden errors for valid tenants.
*   **Mitigation:**
    1.  Disable `TenantIsolationGuard` enforcement via feature flag (if available) OR hotfix `server/src/middleware/tenantContext.ts` to bypass check.
    2.  **Emergency:** Revert the "Wiring & Enforcement" PR.

### Failure Mode: Kill Switch Misconfigured (Outage)
*   **Symptom:** 503 errors on all mutating requests.
*   **Diagnosis:** Check logs for "Global kill switch active".
*   **Mitigation:**
    *   **Disable Flag:** Set `platform.kill-switch.global` to `false`.
    *   **Env Var:** Unset `KILL_SWITCH_GLOBAL`.

### Failure Mode: Verdict Propagation Breaks Clients
*   **Symptom:** Clients crashing due to unexpected `governanceVerdict` fields in JSON response.
*   **Mitigation:**
    *   Switch `GAEnforcementService` to non-strict mode (via config/env) to stop injecting envelopes if possible, or revert the client-facing change.

### Evidence Capture
Before rolling back, capture:
*   `artifacts/logs/*.log`
*   `artifacts/ga/ga_report.json`
*   `docker compose logs > failure.log`

## 6. Communication Packet

### Release Notes Draft
> **Feature:** Runtime Governance Enforcement
>
> **What Changed:**
> *   Added `TenantIsolationGuard` to enforce strict tenant boundaries.
> *   Introduced `GAEnforcementService` to wrap API responses with Governance Verdicts.
> *   Added Global Kill Switch & Safety Mode capabilities.
>
> **Validation:**
> *   CI runs `make ga` to verify system integrity.
> *   Runtime logs now include `verdictId` for auditability.
>
> **Emergency:**
> *   If legitimate traffic is blocked, contact On-Call.
> *   Global Kill Switch can be toggled via `KILL_SWITCH_GLOBAL` env var.

### Ops Quick Card
```
[Ops Quick Card: Governance]
- Status: GA Enforced
- CI Job: ga-gate (Required)
- Verification: `make ga`
- Kill Switch: `KILL_SWITCH_GLOBAL=true` (Stops all writes)
- Safe Mode: `SAFE_MODE=true` (Stops high-risk APIs)
- Tenant Issues: Check logs for "Tenant rate limit exceeded" or "Cross-tenant access denied"
```
