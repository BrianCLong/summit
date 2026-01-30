<!-- ci/dependency_delta.md -->
# Dependency Delta Policy

Every PR that adds/removes deps must:
- update `ci/dependency_delta.md` (this file) with a bullet describing the delta and rationale
- include tests or a justification if no tests apply

This is enforced by CI via `ci/check_dependency_delta.py`.

## [2026-01-29] People Thrive Subsystem
- **Delta**: No new external dependencies.
- **Rationale**: Implementing the "People Thrive" subsystem using existing core infrastructure (Python, React, JSON Schema).
- **Owner**: Jules (Release Captain)
