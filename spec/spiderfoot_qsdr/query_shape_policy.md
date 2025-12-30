# Query-Shape Policy

## Allowed Patterns

- Passive lookups against open data sources with rate limits.
- No active probing (port scans, auth attempts) unless explicitly authorized.
- Endpoint class allowlist; disallowed endpoints (auth, upload, admin) blocked.

## Enforcement

- Streaming inspector classifies queries; compares against allowlist and rate budget.
- Violations raise policy events; repeat offenders escalate to kill switch.
- Per-target privacy budget caps lookups, bytes, and retention duration.

## Audit

- Policy decision identifiers captured with each violation event.
- Logs hashed under proof budget; inclusion proofs stored in transparency log.
