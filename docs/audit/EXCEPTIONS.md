# Exception and Risk Acceptance Handling

All exceptions must be time-bounded, justified, reviewed, and automatically enforced via CI.

## Required Fields

- **id** — Stable, unique identifier.
- **justification** — Why the exception is required.
- **approved_by** — Governance body providing approval.
- **created_at / expires_at** — ISO dates; CI fails when expired.
- **scope** — Systems, services, or directories impacted.
- **risk** — Low/medium/high classification.
- **mitigation** — Planned remediation and guardrails.

## Process

1. Add or update entries in `audit/exceptions.yaml`.
2. Open a PR with the rationale; CI will validate dates and format.
3. Expired exceptions trigger the `audit-exception-expiry` workflow to fail the build.
4. Removal or renewal requires updated dates and a refreshed approval reference.

## Enforcement

- CI job: `.github/workflows/audit-exception-expiry.yml` runs `node scripts/audit/check-exceptions.js`.
- Policy: Exceptions cannot be added without expiry. Entries lacking required fields fail validation.
- Evidence: CI logs plus Git history serve as the immutable record of approvals and expirations.
