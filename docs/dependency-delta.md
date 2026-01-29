# Dependency Delta (Summit Niche Radar)

## PR: Evidence Scaffolding and CI Verifier
**Date**: 2026-01-28
**Owner**: Jules

### New Dependencies
- **Python**: `jsonschema` (Required for `tools/ci/verify_evidence_bundle.py` to validate JSON schemas).

### Removed Dependencies
- None

### Security/Governance Review
- `jsonschema` is a standard, widely-used library for JSON validation.
- Used only in CI/Tooling, not in production runtime path.
