# Fast + Deterministic Builds v1 (CI)

## Objective

Implement CI-only improvements for pnpm caching, Buildx layer caching, reproducible image
normalization, and deterministic/runtime stamp separation. The change set must be reversible and
confined to CI/workflow + tooling + documentation updates.

## Required Outputs

- pnpm store caching keyed by OS + pnpm version + lockfile hash.
- Buildx cache scopes keyed by Dockerfile hash + lockfile hash.
- `SOURCE_DATE_EPOCH` derived from commit timestamp for image builds.
- Deterministic stamp without timestamps, plus runtime stamp with run metadata.
- Image digest stability eval (report-only) that emits `metrics.json` and `diff_report.json` on
  mismatch.

## Scope

Allowed paths:

- .github/workflows/
- tools/ci/
- evals/
- docs/ci/
- docs/evidence/
- schemas/evidence/
- docs/roadmap/STATUS.json
- prompts/ci/fast-deterministic-builds-v1.md
- prompts/registry.yaml
- agents/examples/

## Verification

Tier C. Provide evidence artifacts when possible (stamp outputs + eval metrics). Avoid introducing
nondeterministic fields into deterministic artifacts.
