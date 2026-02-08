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
- pip-audit targeted re-runs for `requirements.txt`, `services/ml-training/requirements.txt`, and `summit-cog-war/requirements-optional-graph.txt`: completed clean.
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

- Repo root: `cargo audit` completed after updating RustSec DB and crates.io index; no advisories listed in output.

## Python (pip-audit)

- Full sweep across every `requirements*.txt` file (`pip-audit --disable-pip --no-deps`) completed with **no known vulnerabilities**.
- Skipped (not on PyPI / URL pins): `playwright` 1.48.2, `albumentation` 1.3.1, `spython-dateutil` 2.8.2, `en-core-web-lg`, `en-core-web-sm`, `gitlib`, `ipqualityscore` (optional; commented out).

## Python Remediations Applied

- Updated `fastapi` to 0.109.1 in `ga-caseops/packages/caseops/requirements.txt`, `services/prov-ledger/requirements.txt`, `ai/cdis/requirements.txt`, `services/graph-xai/requirements.txt`, and `requirements.txt`.
- Updated `marshmallow` to 4.1.2 and `python-multipart` to 0.0.22 in `requirements.txt`.
- Updated `starlette` to 0.49.1 in `requirements.txt`.
- Pinned unversioned requirements in `adversarial-misinfo-defense-platform/requirements.txt` and `server/data-pipelines/requirements.txt` (aligning JS deps to web `package.json` versions where applicable, plus updating Python tooling/runtime pins).
- Updated `tools/synth-probe/requirements.txt` to `requests==2.32.4` for CVE-2024-47081.
- Pinned remaining Python requirements across all service requirement files, replaced python-jose with PyJWT[crypto], and bumped MLflow to 3.5.0 to clear advisories.

## Python Remediation Gaps

- `orjson` (CVE-2025-67221): upgraded to 3.11.7, but advisory status indicates no confirmed fix yet; monitor and reassess.
- Full repo-wide re-audit still pending for a single consolidated report (targeted checks are clean).

## JS/TS (pnpm)

- `pnpm audit` at repo root timed out after 300s.
- `pnpm audit` in `apps/ui` timed out after 300s.
- `pnpm audit` in `intelgraph-mcp` fails (no `pnpm-lock.yaml`).
- `pnpm audit` in `summit-mini` reports 2 vulnerabilities (1 low, 1 moderate).

## Next Actions

1. Run audits in each workspace root to produce a consolidated results table.
2. Rank by severity + exploitability; group into upgrade waves.
3. Track fixes in a dedicated remediation branch with CI evidence attached.
