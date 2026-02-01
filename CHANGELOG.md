# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created `scripts/competitive/scaffold_dossier.ts` for competitive dossier scaffolding.
- Added `validate-claims.yml` for claim verification.
- Added `[Unreleased]` section to CHANGELOG.md.

### Fixed
- Fixed CI pnpm configuration mismatch by syncing lockfile.
- Added `pnpm/action-setup` to multiple GitHub workflows to resolve missing pnpm executable errors.
- Fixed `integrity.yml` to use `pnpm` instead of `npm` for `workspace:*` protocol support.

## [0.1.0] - 2024-01-01
### Added
- Initial release
