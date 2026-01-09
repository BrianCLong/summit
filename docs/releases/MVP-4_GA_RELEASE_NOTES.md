# MVP-4 GA Release Notes (Repo-Grounded)

## What shipped

### GA gate enforcement

- The GA gate is executed through a dedicated make target that invokes the GA gate script, creating a deterministic release verification entrypoint. (Evidence: `Makefile` target `ga`; `scripts/ga-gate.sh`.)
- Tiered GA verification is available via a separate `ga-verify` target that runs GA verification tests and surface checks. (Evidence: `Makefile` target `ga-verify`; `testing/ga-verification/*.ga.test.mjs`; `scripts/ga/verify-ga-surface.mjs`.)

### Demo environment for MVP-4

- A demo environment is available via `make demo`, which wraps the demo launcher script. (Evidence: `Makefile` target `demo`; `scripts/demo-up.sh`.)
- Demo prerequisites can be validated with `make demo-check`, which runs the demo prerequisite checker. (Evidence: `Makefile` target `demo-check`; `scripts/demo-check.sh`.)
- Demo data seeding and demo smoke tests are supported as explicit demo steps. (Evidence: `Makefile` targets `demo-seed` and `demo-smoke`; `scripts/demo-seed.sh`; `scripts/demo-smoke-test.sh`.)

### Release evidence and governance artifacts

- GA release evidence and readiness artifacts are organized under the release governance documentation set. (Evidence: `docs/release/GA_EVIDENCE_INDEX.md`; `docs/release/GA_READINESS_REPORT.md`; `docs/release/GA_CHECKLIST.md`.)
- A scripted evidence collection workflow exists for GA release operations. (Evidence: `scripts/release/collect_evidence.sh`.)

### Release bundle tooling

- Release bundle generation and validation tooling is available in the release scripts directory. (Evidence: `scripts/release/release-bundle.mjs`; `scripts/release/verify-release-bundle.mjs`; `scripts/release/build-ga-bundle.sh`.)

### Rollback runbook

- Rollback execution is exposed via a Makefile target and script path that document how to rollback a release. (Evidence: `Makefile` target `rollback`; `scripts/rollback.sh`; `docs/releases/v4.0.0/MVP4-GA-ROLLBACK.md`.)

## Why it matters

- GA verification and governance checks are explicit in the build system and documented in the GA governance suite, reducing ambiguity and enforcing release readiness. (Evidence: `Makefile` targets `ga`, `ga-verify`; `docs/release/GA_PLAN.md`; `docs/SUMMIT_READINESS_ASSERTION.md`.)
- Demo automation ensures the MVP-4 GA story can be run consistently without manual orchestration, aligning with the golden-path workflow. (Evidence: `scripts/demo-up.sh`; `scripts/demo-seed.sh`; `scripts/demo-smoke-test.sh`.)

## Upgrade and ops notes

- Recommended baseline for GA validation: `make ga` followed by `make ga-verify` and `make smoke`. (Evidence: `Makefile`.)
- Demo environments require `DEMO_MODE=1` and will refuse to run in production mode. (Evidence: `scripts/demo-up.sh`.)
- For verification-only workflows in constrained environments, use `NO_NETWORK_LISTEN=true RUN_ACCEPTANCE=false ZERO_FOOTPRINT=true CI=1` when running test commands. (Evidence: `docs/ga/TESTING-STRATEGY.md`.)

## Known limitations

- Performance baselines are intentionally constrained to synthetic capture in the current Makefile target, pending a dedicated runtime environment for full load testing. (Evidence: `Makefile` target `perf-baseline`.)
- GA readiness is intentionally constrained to documented evidence collection and verification steps; additional operational sign-off is handled in the release governance documents. (Evidence: `docs/release/GA_READINESS_REPORT.md`; `docs/release/GA_EVIDENCE_INDEX.md`.)

## Verification commands

```bash
make ga
make ga-verify
make smoke
make demo-check
make demo
make demo-seed
make demo-smoke
./scripts/release/collect_evidence.sh
./scripts/release/build-ga-bundle.sh
node scripts/release/verify-release-bundle.mjs
```

## Evidence appendix

### Commands

- `make ga`, `make ga-verify`, `make smoke` (Makefile targets).
- `make demo`, `make demo-check`, `make demo-seed`, `make demo-smoke` (Makefile targets).
- `./scripts/release/collect_evidence.sh`, `./scripts/release/build-ga-bundle.sh`, `node scripts/release/verify-release-bundle.mjs` (release scripts).

### Key files

- `Makefile`
- `scripts/ga-gate.sh`
- `testing/ga-verification/*.ga.test.mjs`
- `scripts/ga/verify-ga-surface.mjs`
- `scripts/demo-up.sh`
- `scripts/demo-check.sh`
- `scripts/demo-seed.sh`
- `scripts/demo-smoke-test.sh`
- `docs/release/GA_EVIDENCE_INDEX.md`
- `docs/release/GA_READINESS_REPORT.md`
- `docs/release/GA_CHECKLIST.md`
- `scripts/release/collect_evidence.sh`
- `scripts/release/release-bundle.mjs`
- `scripts/release/verify-release-bundle.mjs`
- `scripts/release/build-ga-bundle.sh`
- `scripts/rollback.sh`
- `docs/releases/v4.0.0/MVP4-GA-ROLLBACK.md`

### Environment flags

- `NO_NETWORK_LISTEN=true`
- `RUN_ACCEPTANCE=false`
- `ZERO_FOOTPRINT=true`
- `CI=1`
