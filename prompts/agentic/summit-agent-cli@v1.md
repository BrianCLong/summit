# Summit Agent CLI Scaffold (v1)

## Mission

Implement the `summit-agent` CLI scaffold that formalizes the plan → run → verify → ship loop with
Switchboard receipts, acceptance checklists, and ship gating.

## Requirements

- Add a new `packages/summit-agent` workspace package with CLI commands: `plan`, `run`, `verify`, `ship`.
- Emit a session directory at `.summit-agent/sessions/<id>/` with:
  - `receipts.jsonl`
  - `summary.md`
  - `checklist.yml`
  - `checklist_report.json` + `checklist_report.md`
- Block `ship` when verification fails.
- Document the architecture and governance alignment in `docs/summit-agent.md`.
- Update `docs/roadmap/STATUS.json` with a revision note.
- Add a minimal unit test for checklist serialization.
- Update lint-staged to suppress ignored-file warnings for packages.

## Guardrails

- Keep dependencies minimal and align with existing CLI conventions.
- Route all tool execution through a Switchboard adapter that logs receipts.
- Provide deterministic session ids via `--session`.
- Do not modify unrelated zones.
