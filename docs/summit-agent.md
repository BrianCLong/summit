# summit-agent CLI (Plan → Run → Verify → Ship)

`summit-agent` is Summit's agentic coding CLI scaffold. It formalizes the
plan → execute → verify → ship loop, records tool receipts, and emits evidence
bundles suitable for GA verification.

## Architecture Overview

- **Maestro**: task graph and orchestration (future integration).
- **Switchboard**: tool routing and receipt logging (current implementation).
- **Policy Gates**: ship blocks unless verify passes.
- **Evidence Bundle**: receipts, checklist, and verification reports per session.

## Session Layout

Each session writes to `.summit-agent/sessions/<id>/`:

- `receipts.jsonl`: append-only tool receipts.
- `summary.md`: plan summary.
- `checklist.yml`: acceptance checklist compiled from the task.
- `checklist_report.json` + `checklist_report.md`: verification results.

## Deterministic Operation

Pass `--session <id>` on each command to keep outputs stable across runs.

## Governance Alignment

This CLI must align with the Summit Readiness Assertion and GA evidence rules.
See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/ga/` for canonical authority.
