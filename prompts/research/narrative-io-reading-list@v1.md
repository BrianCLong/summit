# Prompt: Narrative/IO Reading List + Pipeline Mapping

## Objective
Create Summit-usable research artifacts that translate a curated narrative/framing + information-operations reading list into pipeline-ready signals and evaluation hooks.

## Required Changes
- Add `docs/research/NARRATIVE_IO_READING_LIST.md` with the curated references and pipeline insertion notes.
- Add `docs/research/NARRATIVE_IO_REFERENCE_TO_PIPELINE_MAP.md` with the mapping table.
- Add `docs/research/INDEX.md` linking the new research artifacts.
- Add `policy/cib/README.md` describing the policy intent and linkage to the research artifacts.
- Add `eval/narratives/README.md` describing the evaluation harness linkage.
- Update `docs/roadmap/STATUS.json` with a revision note and narrative-ops governed docs note.
- Record a DecisionLedger entry with rollback steps in `packages/decision-ledger/decision_ledger.json`.
- Add a task spec under `agents/examples/` conforming to `agents/task-spec.schema.json`.
- Register this prompt in `prompts/registry.yaml` with scope covering the touched paths.

## Constraints
- Documentation-only changes; no runtime code paths.
- Maintain evidence-first posture and cite authoritative sources.
- Use conventional commit messages.

## Verification
- Tier C documentation verification (no tests required).

