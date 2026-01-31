# Summit — Smoke Diagnostics + Preflight (v1)

**Objective:** Make server smoke tests actionable by printing precise error diagnostics, adding a /health preflight, and supporting standalone/full modes without changing runtime behavior.

## Scope
- `server/scripts/smoke-test.cjs`
- `docs/operations/runbooks/STARTUP_AND_CONFIG.md` (optional)
- `docs/roadmap/STATUS.json`
- `prompts/operations/smoke-diagnostics-preflight@v1.md`
- `prompts/registry.yaml`

## Constraints
- Do not change server runtime behavior or routes.
- Keep changes limited to smoke harness and optional doc note.
- Maintain existing exit code semantics.

## Required Behavior
- Print per-endpoint status, body snippet (<= 500 chars), and timing.
- On connection errors, print host/port and exact curl command.
- Preflight GET `/health` with short timeout:
  - connection failure → clear “server unreachable” message + exit nonzero
  - 404 → “endpoint mismatch” message + exit nonzero
- Support `SMOKE_MODE=standalone|full` (default full).
- For `/health/ready`, parse JSON and print failing dependencies when available.

## Acceptance Criteria
- Standalone mode passes with minimal startup.
- Full mode passes with full stack.
- Failures are self-diagnosing and reproducible.
