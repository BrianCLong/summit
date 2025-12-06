# Safe Mode & Global Kill Switch

This document defines the initial incident controls for running the Summit platform in a degraded, safety-first posture. Two environment-controlled gates are available:

- `KILL_SWITCH_GLOBAL` — immediately forces the platform into read-only mode and halts risky subsystems.
- `SAFE_MODE` — starts the platform in a reduced, safety-first configuration with non-essential automation disabled.

Both flags may also be driven by feature flags (see `server/src/config/safety.ts`) for faster remote toggles; environment variables always win.

## Global Kill Switch (`KILL_SWITCH_GLOBAL=true`)

When the global kill switch is active the platform prioritizes containment:

- **API mutations rejected:** HTTP routes that mutate state (REST writes, GraphQL mutations, schedulers) return `503` with a `GLOBAL_KILL_SWITCH_ACTIVE` code.
- **Outbound and side-effectful automations halted:**
  - Background workers (trust scoring, retention cleanup) do not start.
  - Kafka consumers and webhook workers stay idle.
- **Read-only surfaces remain available:**
  - Core UI/API reads (GETs and GraphQL queries) continue to serve data.
  - Health/metrics endpoints remain reachable for observability.

## Safe Mode (`SAFE_MODE=true`)

Safe mode is a degraded but operational posture for incident containment or controlled recovery. Safe mode focuses on preventing cascading side effects while allowing inspection and triage.

- **Do NOT start:**
  - Background workers and schedulers (trust scoring, retention cleanup).
  - External webhooks and streaming/autonomous compute lanes (`/api/webhooks`, `/api/stream`, `/api/ai`, `/api/aurora`, `/api/oracle`, `/api/phantom-limb`, `/api/echelon2`, `/api/zero-day`, `/api/abyss`, `/api/scenarios`).
  - Non-essential Kafka consumers and realtime emitters.
- **Remain available (read-only):**
  - UI/API read paths (GETs and GraphQL queries) for investigation.
  - Health checks, metrics, and logs for situational awareness.
- **Mutating operations:** follow the same high-risk endpoint restrictions above; low-risk mutations remain subject to service-level policy.

## Configuration & Precedence

- Environment variables are authoritative. `KILL_SWITCH_GLOBAL=true` or `SAFE_MODE=true` immediately enforce the respective behavior.
- Feature flags can mirror these settings when available. The defaults are:
  - `platform.kill-switch.global`
  - `platform.safe-mode`
- If a feature flag service is unreachable, the platform defaults to **safe** (mutations blocked only when env flags are set).

## Operational Notes

- **Activation:** Set the environment variables or enable the feature flags. Prefer environment variables for incident response because they take effect immediately and override flag drift.
- **Deactivation:** Clear the environment variables and disable the feature flags, then restart any paused workers if needed.
- **Auditability:** All kill-switch or safe-mode blocks are logged with request metadata for downstream incident analysis.
