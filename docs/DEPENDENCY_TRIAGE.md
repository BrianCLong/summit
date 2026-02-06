# Dependency Triage (Initial)

This file captures the initial dependency surface scan and the next audit steps.

## Current Signals

- GitHub reported 556 vulnerabilities on the default branch during the latest push.
- Local inventory counts (lockfiles / manifests):
  - JS/TS: `pnpm-lock.yaml` x 622, `package.json` x 951, `package-lock.json` x 1
  - Python: `requirements*.txt` x 57, `poetry.lock` x 2
  - Go: `go.mod` x 44, `go.sum` x 19
  - Rust: `Cargo.toml` x 34, `Cargo.lock` x 19
  - Gradle: `build.gradle` x 2, `build.gradle.kts` x 3

## Audit Commands (Per Ecosystem)

Run these from repo root (or the specified workspace root):

- JS/TS (pnpm workspace root): `pnpm audit --audit-level=high`
- JS/TS (intelgraph-mcp workspace): `cd intelgraph-mcp && pnpm audit --audit-level=high`
- JS/TS (summit-mini workspace): `cd summit-mini && pnpm audit --audit-level=high`
- JS/TS (npm legacy): `npm audit --audit-level=high`

- Python (requirements): `pip-audit -r requirements.txt` (repeat for each service)
- Python (poetry): `poetry audit`

- Go: `govulncheck ./...`
- Rust: `cargo audit`
- Gradle: `./gradlew dependencyCheckAnalyze`

## Status

- pnpm audit from repo root: started but did not complete (hung; terminated).
- Remaining audits: pending (requires time + network access).

## Next Actions

1. Run audits in each workspace root to produce a consolidated results table.
2. Rank by severity + exploitability; group into upgrade waves.
3. Track fixes in a dedicated remediation branch with CI evidence attached.
