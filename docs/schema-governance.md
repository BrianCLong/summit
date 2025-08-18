# Schema Governance

This document defines the process for evolving the IntelGraph schema.

## Review Protocol
- Every schema change requires code review and approval from the data
  architecture team.
- Breaking changes (removing labels, properties, or relationships) must bump
  the major version and require migration plans.
- Non-breaking additions (new labels, properties, optional fields) may bump the
  minor version.

## Version Lifecycle
- Versions follow [semver](https://semver.org/): `MAJOR.MINOR`.
- `active_version.txt` defines the version deployed to production.
- Deprecated versions remain for two release cycles before removal.

## Backward Compatibility
- Prefer additive changes.
- Migrations must provide `up` and `down` steps for reversibility.

## Security & Resilience
- Each version snapshot stores a SHA256 hash for immutability.
- The platform warns when the runtime schema hash differs from the registered
  hash.
- Graph metadata is backed up nightly using existing backup tooling.
