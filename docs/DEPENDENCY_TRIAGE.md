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
- npm audit in `webapp`: fixed (0 vulnerabilities after `npm audit fix`).
- pip-audit on `python/requirements.txt`: stalled while creating isolated env; terminated.
- cargo audit on `services/safejoin`: stalled fetching RustSec DB; terminated.
- Remaining audits: pending (requires time + network access).
  - Remediations applied:
    - `services/safejoin`: bumped `bytes` to 1.11.1.
    - `webapp`: `npm audit fix` completed; 0 vulnerabilities reported.
    - Go modules: all `go.mod` files set to Go 1.24 + toolchain go1.24.13.

## Go (govulncheck)

- Module: `services/acc`
- Result: 16 Go stdlib vulnerabilities detected (Go 1.22.2), plus 7 in imported packages and 9 in required modules that are not directly called.
- Notable stdlib IDs: GO-2026-4340, GO-2026-4337, GO-2025-4175, GO-2025-4155, GO-2025-4013, GO-2025-4011, GO-2025-4010, GO-2025-4009, GO-2025-4008, GO-2025-4007, GO-2025-3750 (Windows), GO-2025-3563, GO-2025-3447 (ppc64le), GO-2025-3373, GO-2024-2887, GO-2024-2824.
- After bumping all modules to Go 1.24, rerun with `GOTOOLCHAIN=go1.24.13` failed due to toolchain compile errors on Go 1.24 sources; local Go toolchain upgrade required.
- Go 1.24.13 installed locally; rerun with PATH override succeeded for most modules.
- govulncheck now passes for all modules after fixing import paths and Go workspaces.
- pnpm audit in `apps/a11y-lab` still hangs (even with `--ignore-registry-errors`).

## Rust (cargo-audit)

- Module: `services/safejoin`
- Result: RustSec DB loaded, but scan failed checking yanked crates (missing crates in local index without refresh).
- Found: RUSTSEC-2026-0007 in `bytes` 1.10.1 (upgrade to >= 1.11.1).

## Python (pip-audit)

- `pip-audit -r python/requirements.txt --no-deps` stalled while creating isolated env (even with OSV + timeout).
- Batch run (OSV, `--no-deps`, 300s timeout per file): 39/57 completed.
- Vulnerabilities found:
  - `airflow/requirements.txt`: starlette 0.48.0 (CVE-2025-62727) → 0.49.1
  - `ga-caseops/packages/caseops/requirements.txt`: starlette 0.36.3 (CVE-2025-54121, CVE-2024-47874) → 0.47.2/0.40.0
  - `summit-cog-war/requirements.txt`: dgl 2.1.0 (GHSA-3x5x-fw77-g54c)
  - `services/prov-ledger/requirements.txt`: starlette 0.40.0 (CVE-2025-54121, CVE-2025-62727) → 0.47.2/0.49.1
  - `ai/cdis/requirements.txt`: starlette 0.38.6 (CVE-2025-54121, CVE-2024-47874) → 0.47.2/0.40.0
  - `requirements.txt`: marshmallow 3.26.1 (CVE-2025-68480) → 4.1.2; ecdsa 0.19.1 (CVE-2024-23342); starlette 0.48.0 (CVE-2025-62727) → 0.49.1; orjson 3.11.4 (CVE-2025-67221); python-multipart 0.0.21 (CVE-2026-24486) → 0.0.22
  - `services/graph-xai/requirements.txt`: fastapi 0.109.0 (PYSEC-2024-38) → 0.109.1; starlette 0.35.1 (CVE-2025-54121, CVE-2024-47874) → 0.47.2/0.40.0
- Errors/timeouts (needs targeted follow-up):
  - `v24_modules/requirements.txt`, `apps/ml-engine/src/python/requirements.txt`, `predictive_threat_suite/requirements.txt`, `services/insight-ai/requirements.txt`: pip internal failure during resolution.
  - `api/requirements.txt`: fastapi==0.130.0 not found on index.
  - `adversarial-misinfo-defense-platform/requirements.txt`, `server/data-pipelines/requirements.txt`, `server/requirements.txt`: pinned deps incompatible with Python 3.12.
  - `server/services/osint_service/requirements.txt`: missing `ipqualityscore` package.
  - `services/vision-api/requirements.txt`: dependency conflicts (torch 2.6.0).
- Remaining (not yet scanned):
  - `copilot/requirements.txt`
  - `frontend/requirements.txt`
  - `policy-fuzzer/requirements.txt`
  - `server/src/nlp/scripts/requirements.txt`
  - `services/cyber-intel-service/requirements.txt`
  - `services/deepfake-detection-service/requirements.txt`
  - `services/er/requirements.txt`
  - `services/ingest-sandbox/requirements.txt`
  - `services/lac-compiler/requirements.txt`
  - `services/ml-serving/requirements.txt`
  - `services/ml-training/requirements.txt`
  - `services/scout/requirements.txt`
  - `services/strategic-foresight/requirements.txt`
  - `services/threat-hunting-service/requirements.txt`
  - `tools/alertsync/requirements.txt`
  - `tools/deps-drift/__tests__/fixtures/requirements.txt`
  - `tools/summit-mds/requirements.txt`
  - `tools/synth-probe/requirements.txt`

## JS/TS (pnpm)

- `pnpm audit` in `apps/ui` still hangs (even with `--ignore-registry-errors`).

## Next Actions

1. Run audits in each workspace root to produce a consolidated results table.
2. Rank by severity + exploitability; group into upgrade waves.
3. Track fixes in a dedicated remediation branch with CI evidence attached.
