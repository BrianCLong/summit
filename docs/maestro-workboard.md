# Maestro Workboard (PR-1 MVP)

Maestro Workboard is a Summit-native command center for managing autonomous work items with
policy gating, evidence bundles, and deterministic, replayable execution logs.

## Quickstart

```bash
cd apps/maestro-workboard
pnpm install
pnpm dev
```

Open http://localhost:4010 to view the board.

## Architecture (PR-1)

- **Board UI**: Static HTML served by the Express server with Kanban columns.
- **API**: Minimal REST endpoints for work items and runs.
- **Runner**: Executes a plan → implement → validate lifecycle and produces an evidence bundle.
- **Policy Gate**: Capability profiles define what tools can execute.
- **Worktree Isolation**: Each run creates a git worktree for safe task isolation.
- **Replayability**: Every run stores structured events, command output, and provenance metadata.

## API Surface

- `POST /api/work-items`
- `PATCH /api/work-items/:id`
- `POST /api/work-items/:id/runs`
- `GET /api/runs/:runId`
- `GET /api/runs/:runId/events`
- `GET /api/runs/:runId/events/stream` (SSE)
- `GET /api/capability-profiles`

## Evidence Bundles

Each run writes a bundle under `.maestro-workboard/evidence/<runId>` with:

- `plan.md`
- `changes.diffstat.json`
- `test-results.json`
- `security-notes.md`
- `provenance.json`
- `summary.md`

## Capability Profiles

Profiles are defined in `server/policy.js`. The default profile is **read-only** with no network
or secrets access. Commands outside the allowlist are blocked, and policy violations are recorded
as run failures.

## Determinism & Replay

Events are stored in the run record as structured entries. The stored evidence bundle +
provenance metadata make replay feasible for PR-2+ (replay engine stubbed).

## Deferred (PR-2+)

- Parallel run orchestration and scheduling
- Dependency-aware DAG execution
- Skill pack registry and dynamic loading
- Automated PR generation and review workflows
- Live diff/test execution inside worktrees
