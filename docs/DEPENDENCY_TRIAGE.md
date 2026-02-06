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
- pnpm audit in `apps/ui`: started but did not complete (hung; terminated).
- pnpm audit in `intelgraph-mcp`: failed (no `pnpm-lock.yaml`).
- npm audit in `webapp`: 1 high severity vulnerability in `hono` (multiple advisories); `npm audit fix` available.
- pip-audit on `python/requirements.txt`: stalled while creating isolated env; terminated.
- cargo audit on `services/safejoin`: stalled fetching RustSec DB; terminated.
- Remaining audits: pending (requires time + network access).

## Go (govulncheck)

- Module: `services/acc`
- Result: 16 Go stdlib vulnerabilities detected (Go 1.22.2), plus 7 in imported packages and 9 in required modules that are not directly called.
- Notable stdlib IDs: GO-2026-4340, GO-2026-4337, GO-2025-4175, GO-2025-4155, GO-2025-4013, GO-2025-4011, GO-2025-4010, GO-2025-4009, GO-2025-4008, GO-2025-4007, GO-2025-3750 (Windows), GO-2025-3563, GO-2025-3447 (ppc64le), GO-2025-3373, GO-2024-2887, GO-2024-2824.

## Rust (cargo-audit)

- Module: `services/safejoin`
- Result: RustSec DB loaded, but scan failed checking yanked crates (missing crates in local index without refresh).
- Found: RUSTSEC-2026-0007 in `bytes` 1.10.1 (upgrade to >= 1.11.1).

## Python (pip-audit)

- `pip-audit -r python/requirements.txt --no-deps` stalled while creating isolated env (even with OSV + timeout).

## JS/TS (pnpm)

- `pnpm audit` in `apps/ui` still hangs (even with `--ignore-registry-errors`).

## Next Actions

1. Run audits in each workspace root to produce a consolidated results table.
2. Rank by severity + exploitability; group into upgrade waves.
3. Track fixes in a dedicated remediation branch with CI evidence attached.
