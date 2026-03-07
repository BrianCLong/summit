# OSINT Hallucination Mitigation Runbook

## Objective

Execute OSINT runs with provenance-required facts, deterministic evidence IDs, and
verifier gates that flag unsupported claims.

## How to Run

```bash
python scripts/osint_run.py --case <fixture> --out artifacts/osint/<run_id>
```

## Interpreting Verification Output

- `needs_human_review: true` means unsupported claims or missing provenance were
  detected.
- `unsupported_claims[]` lists claims without Evidence ID support.
- `missing_provenance_facts[]` lists fact IDs missing required fields.

## Triage Checklist

1. Confirm provenance fields are complete for every fact.
2. Validate two-source promotion for any `confirmed` fact.
3. Remove or downgrade unsupported narrative claims.
4. Re-run verification and ensure `needs_human_review` is cleared.

## Operational SLO (Initial)

- 95% of runs complete under the agreed CI runner time budget.
