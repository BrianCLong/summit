# Autonomous Engineer v2 Repo Assumptions

## Verified
- `agents/`, `scripts/`, `docs/`, `artifacts/`, and `metrics/` exist in the repository root.
- `docs/roadmap/STATUS.json` is the active roadmap status index.

## Assumed (deferred pending focused verification)
- CI checks `check_plan_gate`, `check_patch_policy`, and `check_eval_min_score` can be added without renaming existing gates.
- Artifact contract additions under `artifacts/schemas/` do not conflict with current consumers.
- Python-based gate scripts are acceptable in current CI job runners.

## Must-Not-Touch (until explicit verification task)
- Existing artifact schema IDs and semantics outside `autonomous-engineer-v2` files.
- Existing workflow names under `.github/workflows/`.
- Security policy enforcement modules outside this scoped lane.
