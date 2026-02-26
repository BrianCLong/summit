# Design MCP Repo Assumptions (Validated)

## Verified (2026-02-25)

- Repository includes `src/agents/` and supports adding a new `src/agents/design/` lane.
- CI workflow location is `.github/workflows/` with existing governance/evidence gate patterns.
- Determinism/evidence helper patterns exist under `scripts/ci/`.
- Feature flags are centrally configured in `config/feature-flags.json`.
- `docs/roadmap/STATUS.json` exists and is maintained as an execution invariant.
- Jest-based TypeScript tests are enabled from repository root under `tests/`.

## Assumed

- Design MCP provider endpoint remains external and API-key authenticated.
- Design provider output remains JSON + HTML/CSS artifact payloads.
- Existing release gates will consume `ci-design-artifact-verify` as an additive lane.

## Must-Not-Touch Scope

- Existing GraphRAG query/intent execution paths.
- Production deployment workflows unrelated to design artifacts.
- Core connector behavior outside governed design ingestion.

## Pre-PR Validation Checklist

- Confirm feature flag `design-mcp-enabled` default remains `false`.
- Confirm deterministic triad output: `report.json`, `metrics.json`, `stamp.json`.
- Confirm evidence ID format: `SUMMIT-DESIGN-<YYYYMM>-<HASH12>`.
- Confirm deny-by-default file writes are constrained to `artifacts/ui-design/<design-id>/`.
- Confirm CI lane enforces path constraints and timestamp-key denial in deterministic artifacts.
