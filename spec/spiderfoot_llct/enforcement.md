# Enforcement Logic

## Execution
1. Receive OSINT execution request and validate correlation token.
2. Execute modules; before persisting outputs, evaluate whether links comply with token scope.
3. Block link creation beyond hop count; store disallowed identifier types as redacted/hashed indicators.
4. Enforce egress budget on exported results; redact as needed.
5. Generate linkage receipt with linked identifiers, token hash, hop/egress usage, and append to hash-chained ledger.
6. Optionally include attestation quote from enforcement runtime.
