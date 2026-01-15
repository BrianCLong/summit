# summit-agent

Summit-native coding agent CLI that implements a plan → run → verify → ship loop with
receipt logging and evidence bundles.

## Commands

- `summit-agent plan "<task>"` → creates a session, plan, and acceptance checklist.
- `summit-agent run` → runs declared steps via Switchboard receipts.
- `summit-agent verify` → runs checklist verifiers and emits checklist reports.
- `summit-agent ship` → blocks shipping until checklist verification passes.

## Evidence

Each session writes to `.summit-agent/sessions/<id>/`:

- `receipts.jsonl` (append-only tool receipts)
- `summary.md` (human-readable summary)
- `checklist.yml`
- `checklist_report.json` and `checklist_report.md`

## Governance

Summit-agent aligns to the Summit Readiness Assertion and GA evidence expectations.
See `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/ga/` for enforcement details.
