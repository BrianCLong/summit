# Data Handling: Software Factory Subsumption (StrongDM 2026)

Status: Active draft for governed adoption.

## Never-log List

- API keys, tokens, auth headers, cookies.
- Raw customer data or unredacted traces.
- Secrets in environment variables or config files.

## Retention Policy (default)

- Retain: scenario results, redacted traces, satisfaction rubric inputs/outputs.
- Default retention: 30 days for CI artifacts (configurable by environment policy).

## Redaction Standards

- Replace identifiers with synthetic placeholders.
- Remove PII and access tokens prior to storage.
- Store a redaction map only in approved secure vaults.

## Access Controls

- Deny-by-default for evidence stores.
- Only allow read access for CI and audit roles.

## Evidence Integrity

- Use deterministic artifacts without timestamps.
- Record content hashes for suites and rubric inputs.

## Handling Exceptions

- Log any retention extensions as governed exceptions.
- Record rationale, scope, and expiry in the decision ledger.
