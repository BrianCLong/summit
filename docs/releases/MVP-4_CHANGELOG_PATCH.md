```diff
*** Begin Patch
*** Update File: CHANGELOG.md
@@
 ## [Unreleased]
@@
+## [4.0.4] - MVP-4 GA - 2026-01-04
+
+### Added
+- GA launch checklist, evidence index, and readiness report to formalize operator release gates.
+- Makefile GA gate and smoke targets for deterministic verification.
+- Release bundle build/verify scripts with tests for error handling.
+- Rollback automation via `make rollback` wrapping `scripts/rollback.sh`.
+- Compliance scripts for SBOM and provenance generation.
*** End Patch
```
