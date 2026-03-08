# Intelligence Data Handling Classification

## Classification Levels

| Level | Description |
| --- | --- |
| public | Open-source and non-sensitive information |
| internal | Company operational data |
| confidential | Protected reports and derived findings |
| restricted | Sensitive investigations and high-impact evidence |

## Never Log

- reporter identities
- IP addresses
- device fingerprints

## Storage and Access Controls

- Restricted and confidential artifacts must be encrypted at rest.
- Access must be role-gated with audited retrieval.
- Provenance and hash-chain verification is required before downstream use.
