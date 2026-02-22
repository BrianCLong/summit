# Context Management Scaffold Prompt (v1)

## Objective
Create PR1 scaffolding for context management in Summit.

## Required changes
- Add minimal `summit/context` package with filesystem abstraction, compression events, thresholds, and middleware scaffolding.
- Add context management evidence schema skeletons under `schemas/context_management/`.
- Add placeholder evidence artifacts for `EVD-DEEPAGENTS-CONTEXT-001` and register them in `evidence/index.json`.
- Update `required_checks.todo.md` with provisional context management checks.
- Add attribution note to `NOTICE`.
- Update `docs/roadmap/STATUS.json` with the scaffolding epic.
- Record the decision and rollback path in `packages/decision-ledger/decision_ledger.json`.

## Constraints
- No behavior changes beyond scaffolding stubs.
- Keep changes additive and low-risk.
- Use conventional commits and include required PR metadata.

## Threats & Mitigations (Planning)
- Prompt injection via retrieved files → treat retrieved content as untrusted data-only input.
- Path traversal or cross-tenant access → enforce tenant-root normalization in the filesystem backend.
- Goal drift after summarization → require structured summary fields in later PRs.
