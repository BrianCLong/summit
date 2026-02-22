# Golden Path Hardening Backlog

Derived from Bug Bash 20250922 and Golden Path verification.

## High Priority (Golden Path Breakers)

### [BB-002] Docker Environment Check & Fallback
**Severity**: Critical
**Area**: Infra
**Description**: The Golden Path (`./start.sh`) fails immediately if the Docker daemon is not running. While correct for local dev, this blocks CI/Sandbox environments that might use remote Docker or need a "mock" mode.
**Proposed Fix**:
- Add a `--mock` or `--ci` flag to `./start.sh` that skips the Docker check and runs the smoke test against a mocked or remote API if configured.
- Or, improve the error message to suggest `make up` alternatives.

### [BB-003] Missing Bug Bash Artifacts
**Severity**: Major
**Area**: Documentation / Process
**Description**: The `BUG_BASH_REPORT_20250922.md` claims issues were found, but the linked files (`P0-critical.md`, etc.) are empty templates.
**Proposed Fix**:
- Locate the missing data or re-run the bug bash.
- Update the report to reflect reality.

## Medium Priority (Reliability)

### [BB-004] Smoke Test Timeout Configuration ✅ RESOLVED
**Severity**: Minor
**Area**: Testing
**Status**: ✅ **RESOLVED (2026-02-06)**
**Description**: `scripts/smoke-test.js` has a hardcoded 30s timeout. On slower machines (or cold CI starts), this causes false negatives.
**Resolution**:
- Made timeout configurable via `SMOKE_TIMEOUT` env var
- Increased default to 60s (from 30s)
- Added to `scripts/smoke-test.js`

## Low Priority (Papercuts)

### [BB-005] Empty Health Check Results ✅ RESOLVED
**Severity**: Minor
**Area**: Testing
**Status**: ✅ **RESOLVED (2026-02-06)**
**Description**: `health-check-results.json` is generated but empty.
**Resolution**:
- Smoke test now writes comprehensive health check results to `health-check-results.json`
- Includes: timestamp, environment, config, summary (total/passed/failed), and per-test details
- Results written on both success and failure for debugging
