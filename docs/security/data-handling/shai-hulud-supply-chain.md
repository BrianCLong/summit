# Data Handling: Shai-Hulud Supply-Chain Subsumption

## Data Classes

- Public: Source URLs and public advisories.
- Internal: Evidence reports, metrics, and runbook notes.
- Confidential: None captured by this bundle.
- Regulated: None captured by this bundle.

## Retention

- Report + metrics: 1 year.
- Stamp: 90 days.
- Evidence index mapping: 1 year.

## Never Log

- Tokens, credentials, or CI secrets.
- User home directory contents.

## Access Controls

- Evidence artifacts stored under evidence/ with deterministic contents.
- Changes are audited via evidence/index.json.
