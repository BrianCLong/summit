# Supply Chain Evidence Operations

## Reading Evidence

Evidence is stored in `evidence/<EVIDENCE_ID>/`.

To fetch evidence for a commit:
```bash
# Example logic
make supplychain.evidence
```

## Troubleshooting

If a build fails verification:
1. Check `report.json` in the evidence bundle.
2. Verify local attestations using `make supplychain.attest.local`.
