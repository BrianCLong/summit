# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI: Added `pnpm/action-setup` to workflows to ensure correct pnpm version (9.12.0) is used.
- CI: Downgraded Node version to 18 in workflows to resolve native module build failures.
- KG-RAG: Added evidence bundle scaffolding and verification for Dual-Channel KG-RAG subsumption.

### Changed
- CI: Hardened `infrastructure-checks` workflow to verify helm directory existence.
- CI: Replaced deprecated `anchore/syft-action` with `anchore/sbom-action`.

## [0.1.0] - 2025-01-01

### Added
- Initial release.
