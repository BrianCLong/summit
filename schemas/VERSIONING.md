# CompanyOS Schema Versioning

- **Version field:** `x-version` (semver).
- **Non-breaking changes (minor/patch):**
  - Adding optional fields.
  - Relaxing enum to include new values when all consumers treat unknowns safely.
- **Breaking changes (major):**
  - Removing or renaming fields.
  - Changing data type of existing fields.
  - Tightening enums (removing options).
- **Process:**
  1. Propose change via PR to `schemas/` with migration notes.
  2. Update `CHANGELOG.md` with schema impact.
  3. For breaking changes:
     - Introduce new versioned schema (`user.v2.schema.json`).
     - Add dual-write/dual-read plan to service ADRs.
     - Set deprecation date for old schema.
