# Summit — Exclude _worktrees From CJS Guard (v1)

**Objective:** Prevent false positives from generated worktrees by excluding `_worktrees/` from the CJS ESM syntax guard.

## Scope
- `scripts/check-cjs-commonjs.cjs`
- `docs/roadmap/STATUS.json`
- `prompts/governance/exclude-worktrees-cjs-guard@v1.md`
- `prompts/registry.yaml`

## Constraints
- Only adjust directory exclusions; no changes to detection logic.
- Keep behavior identical for all other paths.

## Allowed Operations
- Edit existing files.
- Register prompt hash in `prompts/registry.yaml`.

## Acceptance Criteria
- `_worktrees` is excluded from the scan.
- Prompt is registered and hash verified.
- Roadmap status updated with a concise revision note.
