# ADR: DAST Tooling and Safety

## Status
Accepted

## Decision
- Use OWASP ZAP baseline and API scans for authenticated staging testing.
- Run with constrained rate limits and scoped context to prevent production impact.
- Findings exported to ticketing with severity-based SLAs (48h High/Critical, 7d Medium).
- False positives require justification and expiry tracked in `false-positives.yaml`.

## Alternatives
- Manual ad-hoc scans were rejected due to inconsistency.
- Commercial scanners deferred for future evaluation to keep pipeline portable.

## Consequences
- Adds ~5-7 minutes to CI on security jobs.
- Provides repeatable, authenticated coverage and reproducible evidence bundles.
