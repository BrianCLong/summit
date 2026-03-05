# Repository Assumptions Validation (Offline-Local Profile)

## Verified Paths

- `agents/`
- `runtime/`
- `evidence/`
- `ci/`
- `docs/`
- `scripts/`

## Assumed Paths Introduced in This Change

- `runtime/backends/`
- `runtime/config/profiles/`
- `runtime/profiles/offline_local.yaml`
- `scripts/bench/`
- `scripts/monitoring/`
- `docs/ops/runbooks/offline-local.md`
- `docs/security/data-handling/offline-local.md`
- `docs/standards/offline-local.md`

## Risk Areas

- Existing runtime orchestration entrypoints may not yet load `runtime/profiles/offline_local.yaml`.
- CI required-check mapping may need explicit registration for `offline_profile_check`.
- Local OpenAI-compatible backend call semantics can vary between model hosts; endpoint compatibility must be verified in environment.
