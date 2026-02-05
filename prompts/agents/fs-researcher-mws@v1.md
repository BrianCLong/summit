# Prompt: FS-Researcher Workspace Mode (MWS)

## Intent
Implement a deterministic, file-system based research workflow with a KB-only report stage,
feature-flagged CLI entrypoint, security gates, and evidence artifacts.

## Required Outputs
- `summit/agents/fs_researcher/` module
- `summit/cli/fs_research.py`
- `docs/standards/fs-researcher-2602-01566.md`
- `docs/security/data-handling/fs-researcher-2602-01566.md`
- `docs/ops/runbooks/fs-researcher-2602-01566.md`
- `scripts/monitoring/fs-researcher-2602-01566-drift.py`
- `scripts/bench/fs_researcher_profile.py`
- `tests/fs_researcher/*`
- `docs/roadmap/STATUS.json`
- `repo_assumptions.md`

## Constraints
- Feature flag default OFF: `FS_RESEARCHER_ENABLED=0`.
- Deterministic artifacts only (exclude runtime timestamps from stamps).
- No online browsing in MWS; use fixtures only.
- Include MAESTRO alignment (layers, threats, mitigations) in security doc.
