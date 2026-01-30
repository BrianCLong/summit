# Runbook: Subsumption Bundle (item-UNKNOWN)

## Failure modes

- Verifier fails: missing manifest/docs/evidence entries/fixtures.
- Evidence determinism violation.

## Triage

1. Open verifier report.json.
2. Fix missing file or index entry.
3. Re-run local verify script.

## Alert spec

- Signal: CI job `verify_subsumption_bundle` failing on main.
- Action: block merge; require bundle repair PR.
