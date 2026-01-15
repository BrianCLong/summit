# Release Automation CLI (MVP-4+)

Purpose: Implement deterministic, one-command release automation for Summit/IntelGraph releases.

Scope:

- scripts/release/
- docs/releases/
- package.json
- .github/
- artifacts/

Requirements:

- Deterministic outputs for a given git range.
- Safe-by-default behavior; require clean working tree unless --force.
- GA verify stamp required before release cut.
- Monorepo-aware versioning; follow repo conventions.

Deliverables:

- Release CLI script in scripts/release/
- GA verify stamp integration
- Release automation documentation in docs/releases/
- Optional CI lint workflow for release artifacts

Verification:

- Dry-run produces artifacts without repo mutations
- Release notes and evidence pack generated with required sections
