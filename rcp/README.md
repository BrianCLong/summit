# Release Control Plane (RCP)

The Release Control Plane provides deterministic merge eligibility, environment promotion policies, trust scoring, and a tamper-evident release ledger.

## Merge Eligibility

Merge eligibility is evaluated via `rcp evaluate-pr`. It checks:
1. Is the emergency freeze enabled?
2. Does the calculated trust score meet the minimum required by `policy/merge-eligibility.yaml`?
3. Are there any hard failure penalties?

## Promotion Thresholds

Promotions are evaluated via `rcp decide-promotion`. It takes an environment to promote *to*, and compares the current trust score against the required minimum in `policy/promotion-policy.yaml`. It also lists required attestations (e.g., manual approvals).

## Trust Score

The trust score is calculated based on:
* Reproducibility
* Provenance
* Supply Chain Hygiene
* Evidence Completeness
* Explainability

Weights for these subscores are defined in `policy/trust-score-weights.yaml`.

## Ledger

The ledger is a tamper-evident JSONL file (`ledger/release-ledger.jsonl`). See `ledger/README.md` for details on hash chaining and signatures.

## Usage in CI

```bash
# Evaluate a PR
./rcp/bin/rcp evaluate-pr --pr 123 --sha abcdef12 --out rcp-output.json

# Check promotion eligibility
./rcp/bin/rcp decide-promotion --env-from dev --env-to staging --run-id 456 --trust-score 95 --out promo-output.json

# Append to ledger
./rcp/bin/rcp ledger append --entry entry.json --ledger ledger/release-ledger.jsonl --key my-key.pem
```

## Extending Policies

To change thresholds or required checks, update the YAML files in `policy/`. Ensure you bump the `version` and update the `effective_date`.
