# Ledger Standards

- Evidence IDs MUST match `LEDGER:<workflow-id>:<seq>`.
- Any protected side-effect MUST be preceded by a `policy.allowed` event.
- Secrets and tokens MUST be redacted before appending to the store.
- Metrics, Stamp, and Report JSONs MUST exclude unstable timestamps except `stamp.json`.
