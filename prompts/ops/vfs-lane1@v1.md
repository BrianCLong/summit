# Prompt: VFS Lane-1 Scaffolding (v1)

## Objective

Implement the lane-1 VFS foundation (router, local/memory backends, tool adapters, policy hooks),
plus evidence scaffolding and GA verification map updates.

## Scope

- Add VFS core under `src/agents/vfs/`.
- Add VFS contract and policy tests under `tests/agents/vfs/`.
- Add evidence scaffolding files and schemas.
- Update GA verification map and agent contract surfaces.
- Update required checks discovery notes and roadmap status.

## Out of Scope

- SQLite or S3 backends (lane 2).
- Production wiring or runtime enablement.

## Required Outputs

- Evidence bundle files under `evidence/`.
- `.github/scripts/verify-evidence.ts` verifier.
- Docs for architecture and threat model.

## Verification

- Run `make ga-verify`.
