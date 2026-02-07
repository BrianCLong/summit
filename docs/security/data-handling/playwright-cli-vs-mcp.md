# Playwright CLI vs MCP Data Handling Standard

## Readiness Assertion

This data handling standard is aligned with `docs/SUMMIT_READINESS_ASSERTION.md` and governs Playwright CLI/MCP evidence outputs.

## Scope

- Applies to Playwright CLI skill execution artifacts and evidence bundles.
- Applies to MCP compatibility outputs normalized into evidence bundles.

## Data Classification

- Evidence JSON: internal governance data (retain per evidence policy).
- Binary artifacts (screenshots, traces): restricted operational data stored only in artifact stores.

## Never-Log List

- Full DOM dumps
- Cookies or localStorage contents
- Raw URL query strings (store redacted)
- Authentication headers or tokens

## Redaction Rules

- URLs must be stored without query strings.
- Any captured payloads must remove secrets and PII using existing redaction policies.

## Retention

- Evidence JSON: retained per evidence retention policy.
- Binary artifacts: retain only in CI artifact storage and expire per artifact policy.

## Access Controls

- Evidence JSON is accessible to governance reviewers and CI gates.
- Binary artifacts are restricted to CI artifact viewers.

## Incident Handling

- Any evidence bundle containing disallowed content is treated as a governance defect and must be purged per incident response procedures.

## Decision Posture

- Data handling requirements are enforced by default for CLI and MCP outputs.
- Exceptions are governed exceptions and must be documented with a policy record.

