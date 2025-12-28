# Release Readiness: Summit (Sprint N+4)

**Status:** HARDENED
**Date:** 2025-12-26

## Core Guarantees

### 1. Release Gating
No release can proceed without passing the `scripts/release_gate.sh` check, which enforces:
*   **Invariants:** Dependency pinning and no unauthorized `console.log` (currently warning mode).
*   **Policy:** OPA policies must evaluate to allow (simulated in dev environment).
*   **CI Artifacts:** Presence of `slo-results.json` is checked.

### 2. Kill-Switch Mechanism
A centralized kill-switch is implemented for critical modules (e.g., `maestro`).
*   **Mechanism:** Middleware `killSwitchGuard` backed by OPA Policy (`feature-flags.rego`).
*   **Control:** Managed via `scripts/toggle_kill_switch.sh`.
*   **State:** Persisted in `server/opa/data/kill-switches.json`.

### 3. Change Control (Break-Glass)
Emergency bypass is possible ONLY via the Break-Glass Protocol.
*   **Trigger:** `scripts/break_glass.sh` must be executed.
*   **Audit:** Action is logged to immutable `audit/break_glass.log`.
*   **Visibility:** Presence of `.break_glass` file warns all release gates.

### 4. Verification
The system state is verifiable via a single command:
```bash
./scripts/verify_system.sh
```

## How to Verify
1.  Run `./scripts/verify_system.sh` to check all subsystems.
2.  Inspect `audit/break_glass.log` for any unauthorized overrides.
3.  Check `server/opa/data/kill-switches.json` for active blocks.

## Known Limitations
*   OPA binary is required for policy enforcement (mocked in dev/sandbox if missing).
*   Invariant checks are currently set to WARNING for legacy code compatibility; will enforce STRICT mode in GA.
