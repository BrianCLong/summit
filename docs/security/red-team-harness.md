# Red-Team Simulation Harness

This harness runs scripted adversary scenarios safely in staging and CI.

## Scenario Library
- **AuthZ Bypass:** Tampered JWT with downgraded scopes.
- **Tenant Boundary Probe:** Cross-tenant graph query attempt with crafted tenant IDs.
- **Export Abuse:** Bulk export API with pagination abuse and throttling bypass attempts.
- **Token Replay:** Reuse expired session token after logout.
- **Data Exfil via Misclassified Tool:** Attempt to invoke non-allowlisted tool through prompt injection.

Additional scenarios can be added under `tools/security/redteam/scenarios/*.yaml` and are auto-discovered by the runner.

## Safe Execution Controls
- Staging-only host allowlist.
- Rate limited to 3 RPS per scenario.
- Automatic teardown of test data via `cleanup` hooks defined in scenarios.
- Evidence bundle per run stored under `tools/security/redteam/runs/<timestamp>/`.

## Pass/Fail Signals
- Exit code per scenario with normalized reason (e.g., `blocked_by_policy`, `unexpected_success`).
- Consolidated JUnit XML emitted for CI.
- Evidence bundle includes HTTP traces, screenshots (if provided), and redacted payloads.

## Scheduling
- Nightly regression suite via `.github/workflows/redteam.yml`.
- Pre-release gate: triggered on `release/*` branches.

## Misconfiguration Acceptance Test
- The `token-replay-misconfig` scenario deliberately removes replay detection; expected result is **fail** with alert raised. The sample output resides in `test-results/security/redteam-misconfig.txt`.
