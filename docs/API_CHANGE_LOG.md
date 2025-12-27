# API Change Log

This log tracks externally visible API changes (GraphQL, REST, webhooks) with required migration notes and deprecation timelines.

## Entry Template

- **Date**: YYYY-MM-DD
- **Version/Surface**: Semver or schema hash + endpoint scope
- **Change Type**: Added / Changed / Deprecated / Removed / Security / Behavior
- **Summary**: One-line description of the change
- **Impact**: Client impact and migration guidance
- **Deprecation / Removal**: Dates and replacement paths
- **Artifacts**: Links to schema diffs, RFCs, and documentation

## Changes

### 2026-01-03 — Documentation Transparency Bootstrap

- **Version/Surface**: Documentation processes (no API surface impact)
- **Change Type**: Added
- **Summary**: Established mandatory API change-log process and transparency controls; future API changes must register here.
- **Impact**: All API PRs must include a change-log entry and schema diff link before merge.
- **Deprecation / Removal**: n/a
- **Artifacts**: `docs/transparency/radical-documentation-transparency.md`
