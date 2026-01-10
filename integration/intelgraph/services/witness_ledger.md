# Witness Ledger

## Responsibility

- Store witness chains and support subgraphs for verification.
- Serve selective disclosure proofs for audits.

## Inputs

- Artifact ID and witness chain entries.
- Disclosure mode (full, selective, redacted).

## Outputs

- Witness chain retrieval.
- Inclusion proofs for selective disclosure.

## Observability

- Metrics: `witness.store.count`, `witness.fetch.count`.
- Logs: artifact ID, disclosure mode.
