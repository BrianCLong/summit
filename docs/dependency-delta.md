# Dependency Delta (Summit AI Governance)

## PR: AI Governance Foundation
**Date**: 2026-01-27
**Owner**: Jules (Release Captain)

### New Dependencies
- **Python**: `pathlib`, `json`, `unittest` (standard library)
- **CI**: `actions/setup-python@v5`

### Removed Dependencies
- None

### Security/Governance Review
- Standard library only. No third-party packages introduced in core governance logic.
- Redaction logic added for audit trails.

## PR: Cognitive Defense Metrics (PR1)
**Date**: 2026-02-05
**Owner**: Jules

### New Dependencies
- **Python**: `jsonschema` (via `pip`)

### Justification
- Required for strict schema validation of cognitive defense metrics and evidence artifacts in CI.
