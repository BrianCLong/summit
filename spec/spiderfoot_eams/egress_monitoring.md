# Egress Monitoring (EAMS)

## Instrumentation

- DNS/HTTP/TCP interception with per-destination categorization.
- Byte counting per category and per endpoint; capture timestamps and methods.
- Hash-chain commitments over ordered egress events; include halt markers when limits hit.

## Receipts

- Include destination categories, byte counts, halt events, replay token (module version set + time window), and optional attestation quote.
- Store digests in transparency logs; provide Merkle proofs for verification.
