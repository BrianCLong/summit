# GA Prompt #00 CI Evidence Mode Runbook

This runbook executes Prompt `#00` (Feature Discovery -> GA Orchestration) in deterministic, evidence-first mode and produces auditable artifacts for readiness review.

## Scope

- Prompt source: `docs/roadmap-prompts/00-feature-discovery-ga-orchestration.md`
- Canonical policy prompt: `docs/feature-discovery-ga-prompt.md`
- Authority references: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- Status sink: `docs/roadmap/STATUS.json`

## Preconditions

Run from repo root (`/Users/brianlong/Developer/summit`).

```bash
# 1) Authority files and prompt assets exist
ls -la docs/SUMMIT_READINESS_ASSERTION.md \
  docs/governance/CONSTITUTION.md \
  docs/governance/META_GOVERNANCE.md \
  docs/feature-discovery-ga-prompt.md \
  docs/roadmap-prompts/00-feature-discovery-ga-orchestration.md

# 2) Roadmap status is parseable
node -e "const fs=require('fs');JSON.parse(fs.readFileSync('docs/roadmap/STATUS.json','utf8'));console.log('STATUS.json ok')"

# 3) Boundary validation
node scripts/check-boundaries.cjs
```

## Evidence Output Contract

Create one bundle directory per run:

- `artifacts/ga-discovery/<YYYYMMDD-HHMM>/`

Minimum files:

- `uef.json` (raw evidence bundle first)
- `summary.md` (high-level summary + implications)
- `architecture.md`
- `implementation-plan.md`
- `test-plan.md`
- `docs-plan.md`
- `cicd-gates.md`
- `pr-package.md`
- `future-roadmap.md`
- `ga-checklist.md`

## Execution Steps

1. Generate run directory and artifact scaffold.

```bash
scripts/ga/create-prompt-00-evidence-bundle.sh
# Optional deterministic run id:
# scripts/ga/create-prompt-00-evidence-bundle.sh --run-id 20260211-0630
```

Set `OUT_DIR` for follow-on checks:

```bash
RUN_ID="<your-run-id>"
OUT_DIR="artifacts/ga-discovery/${RUN_ID}"
```

2. Execute Prompt `#00` in your LLM runner with strict output ordering.

Required order:

1. `uef.json`
2. `summary.md`
3. `architecture.md`
4. `implementation-plan.md`
5. `test-plan.md`
6. `docs-plan.md`
7. `cicd-gates.md`
8. `pr-package.md`
9. `future-roadmap.md`
10. `ga-checklist.md`

3. Validate evidence completeness.

```bash
scripts/ga/verify-prompt-00-evidence-bundle.sh --run-id "${RUN_ID}"
```

4. Enforce repository checks before sign-off.

```bash
node scripts/check-boundaries.cjs
pnpm lint
pnpm typecheck
pnpm test
make smoke
```

5. Update roadmap status with outcome and blockers.

- Update `docs/roadmap/STATUS.json`:
  - `last_updated`
  - `revision_note`
  - relevant initiative `notes` with run id and artifact path

6. Final decision gate.

- `GO` only if all required files exist, checks pass, and GA checklist has no critical blockers.
- Otherwise mark `NO-GO` with explicit blockers and rollback plan.

## Rollback

Rollback trigger examples:

- Missing `uef.json` or missing ordered outputs
- Any failing gate (`lint`, `typecheck`, `test`, `make smoke`)
- MAESTRO sections absent from outputs

Rollback actions:

1. Mark run `failed` in `manifest.json`.
2. Append blocker detail in `docs/roadmap/STATUS.json` notes.
3. Re-run Prompt `#00` with constrained scope and unresolved blockers list.

## MAESTRO Reporting Requirement

Every run must include a section in `summary.md`:

- `MAESTRO Layers`
- `Threats Considered`
- `Mitigations`

Absence of this section is a run failure.

## Completion Criteria

- Evidence bundle exists and is complete in required order.
- Repo checks pass.
- `docs/roadmap/STATUS.json` updated with run reference.
- Final `GO`/`NO-GO` recommendation is explicit.
