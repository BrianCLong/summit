# Legacy Mode (Formalized)

Legacy Mode is a temporary containment area for pre-GA code that cannot currently meet the Golden Path. It is **not** a default state for new work.

## What Legacy Mode Allows

- Running quarantined components behind explicit feature flags.
- Temporary skips for flaky suites **only** when tracked in an issue with an exit date.
- Read-only adapters used solely for migration bridges.

## What Legacy Mode Never Allows

- Shipping GA-critical logic without Tier A/B/C verification.
- Introducing new surfaces without an exit issue and owner.
- Expanding the blast radius (no new dependencies, configs, or globals) while in Legacy Mode.

## Guardrails

- Any exemption must cite an issue ID and owner in code comments or docs.
- Exemptions expire automatically: remove or renew after the stated date.
- New files **may not** declare Legacy Mode; only pre-existing debt can be labeled as such.

## Exit Criteria

- A passing Tier A/B/C verification proving the issue is resolved.
- Removal of feature flags that forced legacy execution paths.
- Documentation updated to remove the legacy designation.

## Verification Requirements

- GA-critical work must include at least one verification artifact before merge.
- If Tier A is blocked, Tier B or Tier C is mandatory until Jest stability returns.
- `make ga-verify` fails if required features are missing verification entries.
