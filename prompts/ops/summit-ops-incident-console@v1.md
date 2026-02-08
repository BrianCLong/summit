# Prompt: summit-ops-incident-console (v1)

## Objective

Define a Summit Ops & Incident Console skill pack for Codex Desktop with project/thread setup, safe Git profiles, monitoring automation concepts, and incident-mode workflows for the Summit repo.

## Required outputs

- `skills/summit-ops-incident-console/` skill folder with SKILL.md and reference files.
- Skill registry updates in `skills/index.json` and `skills/registry/skills.{manifest,lock}.json`.
- Roadmap update in `docs/roadmap/STATUS.json` referencing the Summit Ops console skill.
- Task spec JSON in `agents/examples/` aligned with `agents/task-spec.schema.json`.
- DecisionLedger entry with rollback guidance in `packages/decision-ledger/decision_ledger.json`.
- Prompt registration entry in `prompts/registry.yaml`.

## Constraints

- Documentation and skill scaffolding only; no policy changes.
- Require explicit human approval for any Git mutations beyond safe commands.
- Maintain evidence-first output guidance and readiness assertions.

## Acceptance criteria

- Skill outputs provide project threads, automations, and incident-mode procedure.
- Registry entries include accurate SHA-256 hashes.
- Roadmap summary totals remain consistent with the initiatives list.
- DecisionLedger entry includes rollback path.
