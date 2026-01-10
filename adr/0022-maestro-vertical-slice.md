# 0022 - Maestro vertical slice boundaries

## Status

Accepted

## Context

We need a minimal yet safe orchestration slice that validates job specs, enforces policy, runs steps, records immutable state, and exposes a CLI (`mc`) for submit/status/logs. The solution must be easy to extend to remote runtimes, richer policy engines, and external observability without breaking the guardrails for denial-before-run and auditability.

## Decision

- **Package**: Implement Maestro as a lightweight Python package under `tools/maestro` with a file-backed state store rooted at `var/maestro`.
- **CLI boundary**: Expose `mc` with subcommands `submit`, `status`, and `logs`. CLI owns request parsing and delegates to the runner; it does not contain business logic.
- **State boundary**: State transitions are append-only JSON arrays per job; illegal transitions raise and fail fast. Job specs are persisted verbatim at submit time for forensic review.
- **Policy boundary**: Policies run before any execution. Supported policies are `owner-present`, `no-destruction`, `prod-requires-approval`, and `max-step-timeout`. Adding a policy is an additive change inside `policy.py`; the runner only depends on the `evaluate_policies` interface.
- **Execution boundary**: The runner currently executes local shell commands with trace propagation (`TRACE_ID` env var). The execution surface is isolated in `_run_steps`, enabling future containerized or remote runtimes.
- **Observability boundary**: All state transitions emit audit records (`var/maestro/audit.log`). Trace IDs are generated if not provided and flow through logs and audit events.

## Consequences

- **Extensibility**: New policies, storage backends, or executors can be introduced by swapping `StateStore` or `_run_steps` while preserving interfaces. Container runtimes can replace the subprocess call without touching validation/policy logic.
- **Safety**: Denied jobs never execute steps because policy evaluation precedes `RUNNING`. Immutable state prevents accidental mutation of historical records.
- **Operability**: File-backed design works offline and in CI. Forward paths include gRPC/HTTP submission handlers that wrap the runner.
- **Observability**: Audit log and per-step logs are durably written to disk. Trace IDs enable downstream tracing or log shipping without changing the job contract.
