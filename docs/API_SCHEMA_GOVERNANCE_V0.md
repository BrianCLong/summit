# API & Schema Governance v0

## Mission

Deliver a governance layer that keeps APIs and data contracts discoverable, reviewed, and versioned so consumers never receive a breaking change unexpectedly.

## Contract Model

- **Artifacts covered**: HTTP/GraphQL APIs, async events (Pub/Sub, Kafka), database schemas and migrations, configuration/file formats, ML feature contracts, and batch data exchange files.
- **Versioning**: Semantic versioning for published interfaces; additive-by-default philosophy for minor versions; majors only when removals are unavoidable. Use explicit version fields (path/headers for APIs, topic version suffixes for events, schema version columns for DB/file formats).
- **Compatibility rules**:
  - Backward compatible: additive fields are optional by default; defaults preserve existing behavior; response shape extensions must not break existing clients.
  - Forward compatible: consumers ignore unknown fields; producers maintain previous field meanings until deprecation window closes.
  - No silent renames; instead add new field + deprecate old with overlap.
  - Migrations must be dual-write/read where applicable until consumers migrate.

## Registries & Review Flow

- **Central registries**: Single source of truth per contract type with ownership, contact, lifecycle status, semantic version, changelog link, and dependency graph. Minimal schema: `id`, `type`, `domain`, `owners`, `version`, `status`, `breaking?`, `links` (OpenAPI/AsyncAPI/DDL), `backward-compat-check` result, `review` history.
- **Onboarding**: New contract requires registry entry + designated owning team + support SLO for incidents.
- **Proposal process**:
  1. Author submits a Contract Change Proposal (CCP) with motivation, consumers, impact, test/rollout plan, and compatibility assessment.
  2. Automated checks run (lint, schema validation, diff vs. previous version, breaking-change detection, OpenAPI/AsyncAPI spectral rules, DB migration lints).
  3. Reviewers: owning team + platform governance + security/privacy where relevant.
  4. Approval recorded in registry with version bump, rollout guardrails, and expected cutover date.
- **CI enforcement**: PR gates run automated diff checks; PR fails on detected breaking change unless approved and marked as major with migration plan. Registries updated via bots post-merge; release notes emitted automatically.

## Deprecation & Migration

- **Policy**: Minimum 2 release cycles or 90 days notice (whichever longer) before removal. Deprecation notice must include last supported version, migration steps, and contact.
- **Communication**: Publish to change-log channels, contract registry feed, and direct alerts to subscribed consumers; include sample payloads and timelines.
- **Dual-running**: Support old/new versions concurrently (e.g., v1/v2 endpoints, dual-topic publish, dual-write DB columns) with parity tests. Telemetry monitors consumer usage to determine safe removal.
- **Migration guides**: Provide code samples, SDK shims, feature flags/traffic-splitting steps, and data backfill instructions.

## Example Event Schema Lifecycle

1. **Proposal**: Engineer drafts CCP for `customer.profile.updated.v2`, describing new optional `marketing_consent` field, marking change as additive and backward compatible.
2. **Validation**: AsyncAPI lint + schema diff confirms additive change; governance reviewer signs off; registry updates status to `approved` with version `2.0.0`.
3. **Rollout**: Service begins dual-publishing `v1` and `v2` events. Consumer readiness tracked in registry; parity checks ensure fields match expectations.
4. **Adoption**: Consumers migrate by reading `marketing_consent` when present; unknown-field tolerance maintained.
5. **Deprecation**: After 90 days with <5% v1 traffic, issue deprecation notice, set removal date, and keep monitoring.
6. **Removal**: Disable `v1` publish path, archive schema, and update registry status to `retired`; migration guide remains accessible.

## Acceptance Checklist (New or Changed Contract)

- Clear owners, domain, and support channel are defined in registry.
- Version bump follows semver and matches change impact (major for breaking removal/rename).
- Automated lint + diff checks executed with results attached; no unapproved breaking changes.
- Backward- and forward-compatibility strategy documented (dual-run, default values, optional fields).
- Deprecation/migration plan with timeline and communication channels is in place when deprecating.
- Test/rollout plan covers canary, telemetry, and rollback steps; monitoring dashboards identified.
- Sample requests/events/rows provided; schema artifacts stored in versioned registry locations.
