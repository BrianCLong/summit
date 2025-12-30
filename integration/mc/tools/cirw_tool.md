# CIRW Tool (MC)

CLI helper to submit identifier sets to the CIRW API, request minimum confidence thresholds, and fetch witnesses.

## Commands

- `cirw submit --ids file.txt --min-confidence 0.8 --policy-scope tenantA`
- `cirw witness --cluster <id> --include-proof`

## Outputs

- Candidate clusters with confidence intervals, witness IDs, and determinism tokens.
