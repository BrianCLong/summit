# Contributing to Maestro

## Branch & Commit
- Branches: `feature/<area>-<short-desc>` (e.g., `feature/workflow-dag-builder`).
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` etc.

## Testing
- Contract tests: `npm run test` (Vitest)
- Manifest validation runs in CI for every PR.

## PR Checklist
- [ ] Acceptance Criteria met
- [ ] Unit tests ≥ 80% for new code
- [ ] OTel traces/logs present
- [ ] Docs updated (README/examples/refs)