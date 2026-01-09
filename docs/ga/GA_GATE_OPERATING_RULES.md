# GA Gate Operating Rules

This document defines the operating rules for the `ga:verify` gate, ensuring that the Golden Path to production remains fast, reliable, and enforced.

## 1. Gate Tiers

We divide verification into two tiers to balance feedback loop speed with rigor.

### `ga:verify:merge` (Required for PR Merge)
*   **Purpose**: Fast, deterministic verification for every code change.
*   **Time Budget**: **<= 10 minutes** (Hard timeout).
*   **Scope**:
    *   Typechecking (Client + Server)
    *   Linting
    *   Build verification
    *   Server Unit Tests (excluding Integration/E2E)
    *   Lightweight Smoke Tests
*   **Failure Mode**: Blocking. PRs cannot merge if this fails.

### `ga:verify:full` (Scheduled / Release)
*   **Purpose**: Comprehensive validation including slower integration tests.
*   **Frequency**: Nightly, or prior to Release Candidate cut.
*   **Scope**:
    *   All of `ga:verify:merge`
    *   Server Integration Tests (`test:integration`)
    *   E2E Tests (`playwright`)
    *   Security Scans
    *   Governance/Compliance Checks
*   **Failure Mode**: Alerts Release Captain; blocks Release promotion.

## 2. Branch Protection Enforcement

The "Golden Path" (`main`) is protected by policies defined in code and enforced by CI.

*   **Policy Source**: `scripts/setup-branch-protection.sh` (defines `REQUIRED_CHECKS`).
*   **Enforcement**: The `Governance Policy Enforcement` workflow runs on every PR and daily schedule.
*   **Verification**:
    *   It extracts the required checks from the source script.
    *   It queries the GitHub API for the live branch protection state.
    *   It fails if there is a mismatch (e.g., a check was removed from the repo settings but exists in policy).

## 3. Operating Procedures

### Enabling the Full Gate
To run the full suite manually:
```bash
pnpm ga:verify:full
```

### Investigating Timeouts
If `ga:verify:merge` times out:
1.  Check the "Profiling" output in the CI logs (steps are timed).
2.  If `Unit Tests` are the bottleneck:
    *   Optimize the slow tests.
    *   Or move them to `test:integration` if they involve I/O or sleep.
3.  If `Build` is the bottleneck:
    *   Investigate cache hits/misses.

### Updating Branch Protection
1.  Modify `scripts/setup-branch-protection.sh` to add/remove checks.
2.  Run the script to apply changes (requires admin): `./scripts/setup-branch-protection.sh`
3.  The daily governance check will automatically align with the new policy.
