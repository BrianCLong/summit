# API Versioning Governance & Deprecation Workflow

## Versioning Scheme

- **Major in URI**: `/v1`, `/v2` etc.
- **Optional Header**: `Accept-Version: 1.2` for granular negotiation.
- **Compatibility**: minor/patch releases must remain backward compatible within a major.

## Deprecation Process

1. Mark endpoint with `Deprecation: true` and `Sunset: <ISO date>` headers.
2. Publish migration guide (`docs/migrations/<service>-vX-to-vY.md`).
3. Add compatibility tests covering deprecated endpoints until after sunset + 1 release.
4. Announce timelines (Slack + release notes) and create tracking ticket.

## Compatibility Tests

- Stored under `tests/contracts/*` with fixtures for each published major.
- CI job `compatibility-check` runs against deployed preview; failures block merge unless version bump + guide present.

## Changelog & Release

- Release pipeline diffs OpenAPI specs and appends to `API_CHANGELOG.md` (per service).
- Releases require checklist: bump version, update docs, confirm compatibility matrix.

## Breaking Change Guardrails

- Any breaking change requires new major version + migration guide + contract tests updated to new baseline while preserving previous until sunset.
