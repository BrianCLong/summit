# Decentralized AI Data Handling

## Forbidden Logging

- Private wallet keys.
- Raw IP addresses.
- Non-public governance votes.
- Contributor identity metadata.

## Allowed Logging

- Aggregated validator entropy metrics.
- Public chain participation statistics.
- Deterministic evidence IDs and artifact checksums.

## Controls

- Deny-by-default when required evidence fields are missing.
- Preserve deterministic outputs (`report.json`, `metrics.json`, `stamp.json`) for auditability.
