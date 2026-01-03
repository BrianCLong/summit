# PR Implementation Plans (Pending Content Access)

## Plan 1: Ingest Raschka 2025H2 Paper List

- **Goal**: Fetch and parse the paper list into `research/raschka-2025H2/papers.json` with full metadata (title, authors, venue, link, category, tags).
- **Scope**: Add an authenticated fetch script under `tools/research/raschka2025h2-fetch.ts` and update `papers.json` generation logic in `research/raschka-2025H2/`.
- **Non-goals**: No model training or evaluation changes; no backlog scoring adjustments beyond ingesting data.
- **Steps**:
  1. Add fetch script using existing HTTP client utilities (`tools/research/`), parameterized with credential injection via environment variables (e.g., `SUBSTACK_SESSION`).
  2. Implement parser to extract paper entries and map them to the taxonomy; validate unique IDs and arXiv/DOI links.
  3. Write unit tests under `tests/research/raschka2025h2-fetch.test.ts` covering parsing and category mapping.
  4. Update `research/raschka-2025H2/papers.json` with real content; regenerate `backlog.md` and `backlog.csv` using scoring rubric.
  5. Add smoke target to `Makefile` (e.g., `make research-raschka-verify`) that checks `papers.json` is non-empty and validated.
- **Tests/CI**: `npm test` (or `pnpm test` if available), `npm run lint`, plus new fetch parser unit tests.
- **Success Metrics**: `papers.json` populated with >=1 entry per category where applicable; validation script passes; provenance links resolve (HTTP 200).

## Plan 2: Backlog Scoring and Publication

- **Goal**: Convert ingested papers into a prioritized backlog with P0/P1/P2 scores and publish in markdown/CSV.
- **Scope**: Implement scoring script under `tools/research/raschka2025h2-score.ts` that consumes `papers.json`.
- **Non-goals**: No changes to production services; no deployment of new connectors.
- **Steps**:
  1. Define scoring model (value, differentiation, effort, risk, impact) consistent with prompt rubric.
  2. Generate `backlog.md` (top 10) and `backlog.csv` (all) from the scoring output; include tags per paper relevance.
  3. Add unit tests under `tests/research/raschka2025h2-score.test.ts` verifying scoring reproducibility and CSV/markdown formatting.
  4. Wire `make research-raschka-score` target to run the scoring and formatting pipeline; include in CI optional job.
- **Tests/CI**: New scoring unit tests; lint/format; optional snapshot tests for backlog outputs.
- **Success Metrics**: Deterministic scores across runs; backlog files contain ranked entries with consistent tags.

## Plan 3: ADR and Telemetry Integration

- **Goal**: Document ingestion decisions and add telemetry hooks for research pipeline health.
- **Scope**: Finalize ADR updates and add provenance/metric emission to fetch/score scripts.
- **Non-goals**: No backend service deployments; no production feature flags.
- **Steps**:
  1. Update ADR with finalized ingestion decisions once content is available.
  2. Add telemetry emission (metrics + provenance logs) to fetch/score scripts; store outputs under `artifacts/research/`.
  3. Add integration test under `tests/research/raschka2025h2-e2e.test.ts` validating pipeline end-to-end with fixture content.
  4. Ensure CI uploads artifacts for audit; update documentation (`research/raschka-2025H2/README.md` if added) with run instructions.
- **Tests/CI**: Unit + e2e tests; lint; ensure metrics logging tests do not require external network by using fixtures.
- **Success Metrics**: Telemetry emitted for each pipeline run; artifacts generated and validated; ADR reflects final decisions.
