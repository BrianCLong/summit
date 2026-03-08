# Repo Assumptions: Interactive Benchmarks Implementation

## Verified Paths
* `benchmarks/` - Exists and contains various subdirectories (e.g., `ci`, `graph`, `harness`, `runner`, `runtime`, `scenarios`). This is where the interactive benchmark substrate will be placed (`benchmarks/interactive/`).
* `agents/` - Exists and contains various subdirectories (e.g., `examples`, `executor`, `governance`, `planner`, `registry`). This is where the benchmark agent adapter layer will be placed (`agents/benchmark/`).
* `artifact/` - Exists and contains GitHub workflow files `.yml.fixed`. Will place artifact JSON schemas here in `artifact/schemas/benchmark/interactive/`.
* `artifacts/` - Exists and contains directories for operational output (e.g., `evidence`, `schemas`). Will be used as the output directory for deterministic benchmark outputs (`artifacts/benchmarks/interactive/`).
* `.github/workflows/` - Exists and contains reusable workflows (`_reusable-*.yml`). Used for CI wiring (`benchmark-*.yml`).
* `.github/required-checks.yml` - Exists and manages required checks for PRs.
* `docs/ci/REQUIRED_CHECKS_POLICY.yml` - Canonical policy source for release gate requirements.
* `__tests__/` - Exists and contains tests. Will be used for benchmark unit tests (`__tests__/benchmark/`).
* `docs/benchmarks/` - Exists and contains benchmark-related documentation. Will place `interactive.md`, `multiagent.md`, etc. here.
* `docs/standards/` - Does not currently exist based on search, but can be created for benchmark standards (`interactive-benchmarks.md`).
* `scripts/` - Exists, contains various scripts. Will place drift monitoring scripts in `scripts/monitoring/`.

## Assumed Paths
* `SECURITY/` - Does not currently exist at the root level, but `SECURITY.md` exists in `.github/`. We will create `SECURITY/benchmark-threat-model.md` as instructed or place it in a relevant existing directory.
* `RUNBOOKS/` - Does not currently exist at the root level. Will create `RUNBOOKS/benchmark-interactive.md` as instructed.
* `GOLDEN/datasets/` - Does not currently exist at the root level. Will create `GOLDEN/datasets/benchmark/interactive/` as instructed for fixtures.

## Inferred Ownership Risks
* Modifying existing reusable workflows or `ci-core.yml` may affect the entire CI pipeline.
* Adding new required checks in `REQUIRED_CHECKS_POLICY.yml` and `.github/required-checks.yml` must be done carefully to avoid blocking all PRs inadvertently.
* Existing benchmark suites inside `benchmarks/` have their own runners and metrics. We should not break them; the new interactive suites must be purely additive.
* `artifact/` directory currently mostly holds what looks like backed-up workflows (`.yml.fixed`). Putting schemas in `artifact/schemas/` is a new pattern but follows the prompt instructions.

## Must-Not-Touch List
* `.github/workflows/_reusable-*.yml` (unless strictly necessary and explicitly allowed)
* `.opa/policy/` (treat as stability-sensitive)
* Existing `benchmarks/*` directories (e.g., `shootout/`, `spatialgeneval/`)
* `docs/ci/README.md` (unless adding non-breaking references)
* `.github/SECURITY.md` (treat as authoritative)

## Validation Checklist Before First PR
* [x] Verify `benchmarks/` exists.
* [x] Verify `agents/` exists.
* [x] Verify `artifact/` and `artifacts/` exist.
* [x] Verify CI workflow directories exist.
* [x] Verify `.github/required-checks.yml` and `docs/ci/REQUIRED_CHECKS_POLICY.yml` exist.
* [x] Map out the additive changes for PR1.
