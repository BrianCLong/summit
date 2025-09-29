# Zero-Knowledge DP Kit

## Statements
- `k \u2265 25` anonymity
- `\u03b5` spend within configured cap
- No raw row exports

## Artifacts
- `.zkp` proof files
- `.zks` succinct statements
- Linked to run identifiers

## Anchoring
- Proof digests anchored to transparency log with timestamps.

## DSAR Handling
- Proof artifacts stored without PII.
- `scripts/compliance/dsar_proofs.py` removes records linked to a subject and issues a signed receipt.
