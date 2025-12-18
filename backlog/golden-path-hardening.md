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

### [BB-004] Smoke Test Timeout Configuration
**Severity**: Minor
**Area**: Testing
**Description**: `scripts/smoke-test.js` has a hardcoded 30s timeout. On slower machines (or cold CI starts), this causes false negatives.
**Proposed Fix**:
- Make timeout configurable via `SMOKE_TIMEOUT` env var.
- Increase default to 60s.

## Low Priority (Papercuts)

### [BB-005] Empty Health Check Results
**Severity**: Minor
**Area**: Testing
**Description**: `health-check-results.json` is generated but empty.
**Proposed Fix**:
- Ensure the smoke test script writes actual health payload to this file on failure.
