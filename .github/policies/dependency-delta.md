# Dependency Delta Policy

All dependency changes must be recorded in `DEPENDENCY_DELTA.md` in the same pull request.

## Scope
- package.json
- pnpm-lock.yaml
- package-lock.json
- npm-shrinkwrap.json
- yarn.lock

## Enforcement
The SummitEvidenceGate CI check fails if dependency files change without updating
`DEPENDENCY_DELTA.md`.
