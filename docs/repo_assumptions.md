# Repo Reality Check: Maestro Integration Assumptions

This document validates the assumptions made during the planning of the Maestro Spec Interview Orchestrator integration.

## Validation Status

- [x] **Prompt registry path exists**: Verified at `prompts/`. Sub-directory `prompts/maestro/` also exists.
- [x] **CI gate names**: Verified authoritative gate name as `GA Gate` in `.github/workflows/ga-gate.yml`. Entrypoint is `pnpm ga:verify` which runs `scripts/ga/ga-verify-runner.mjs`.
- [x] **Evidence ID schema format**: Verified in `evidence/index.json`. IDs follow `EVD-` pattern or `evidence.<name>.v<version>`.
- [x] **Jules task metadata schema**: Verified in `agents/task-spec.schema.json`.
- [x] **Codex module naming conventions**: Checked `agents/codex/`. Follows `type/scope/short-desc` branch naming and uses `flows.yaml` for logic.
- [x] **report.json determinism requirements**: Verified `scripts/ci/check_determinism_extortion.sh` and general "evidence-pack-first" posture.
- [x] **stamp.json timestamp rules**: Verified in `schemas/evidence.stamp.schema.json`. Requires `generated_at_utc`.

## Additional Context

- **Runtimes**: Both Node.js and Python are supported for agents.
- **Governance**: All changes must align with `AGENTS.md` and include the `AGENT-METADATA` block in PRs.
- **Threat Modeling**: Must align with MAESTRO layers and threats.
