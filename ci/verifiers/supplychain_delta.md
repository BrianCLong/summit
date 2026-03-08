# Supply Chain Delta (spec)

Must fail if:
- package.json, requirements.in, or lockfiles are modified without a corresponding update to DEPENDENCY_DELTA.md.

Must pass if:
- No dependency changes occur, OR
- Dependency changes are documented in DEPENDENCY_DELTA.md.
