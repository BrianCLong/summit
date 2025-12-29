# Maestro CLI (mc)

This vertical slice provides a safe job runner with validation, policy enforcement, immutable state, and audit/trace emission.

## Usage

```
./mc submit examples/maestro/success-job.json
./mc status <job-id>
./mc logs <job-id>
```

State and logs are stored under `var/maestro/`:

- `audit.log`: JSONL audit events for every state transition.
- `jobs/<id>/state.json`: Immutable state transition history.
- `jobs/<id>/logs/`: Per-step execution logs.
- `jobs/<id>/spec.json`: Persisted job spec.

## Execution model

1. Load and validate the spec.
2. Enforce policies before running.
3. Emit audit events on each state transition.
4. Propagate `TRACE_ID` to subprocesses and logs.
5. Stop immediately on denial; otherwise execute steps sequentially with retries and timeouts.

## Extending

- Add policies in `tools/maestro/policy.py` and declare them in `docs/maestro/job-spec.md`.
- Swap storage by replacing `StateStore` in `tools/maestro/store.py`.
- Replace the executor in `_run_steps` within `tools/maestro/runner.py` to target containers or remote agents.
